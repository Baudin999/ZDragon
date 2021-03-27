using Compiler.Language.Nodes;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Schema;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ZDragon.Transpilers.OpenAPI {
    public class JsonSchemaTranspiler {

        public IIdentifierExpressionNode Root { get; }
        public readonly JSchema RootSchema;
        private readonly JObject References = new JObject();
        public Dictionary<string, IIdentifierExpressionNode> Lexicon { get; }

        public JsonSchemaTranspiler(IIdentifierExpressionNode root, Dictionary<string, IIdentifierExpressionNode> lexicon) {
            this.Root = root;
            this.Lexicon = lexicon;
            this.RootSchema = new JSchema();
        }

        private (bool, JSchema) MapRecordNode(RecordNode node) {
            var schema = new JSchema();
            schema.SchemaVersion = new Uri("https://json-schema.org/draft/2020-12/schema");
            //schema.Id = new Uri($"https://zdragon.nl/{node.Id}.schema.json");
            schema.Title = node.Id;
            schema.Description = node.Description;
            schema.Type = JSchemaType.Object;

            foreach (var field in node.Fields) {
                var (required, _schema) = MapRecordFieldNode(field);
                schema.Properties.Add(field.Id, _schema);
                if (required) schema.Required.Add(field.Id);
            }

            return (true, schema);
        }

        private (bool, JSchema) MapRecordFieldNode(RecordFieldNode node) {
            var required = true;
            var schema = new JSchema();
            schema.Title = node.Id;
            schema.Description = node.Description;

            var min = node.Restrictions.FirstOrDefault(r => r.Key == "min");
            var max = node.Restrictions.FirstOrDefault(r => r.Key == "max");
            var df = node.Restrictions.FirstOrDefault(r => r.Key == "default");
            var decimals = node.Restrictions.FirstOrDefault(r => r.Key == "decimals");

            if (node.Types.Count == 1) {
                var type = node.Types[0];
                GetSchemaType(schema, node.Restrictions, type);
                if (schema.Type is null) {
                    required = MapReference(type);
                    schema.ExtensionData["$ref"] = $"#/references/{type}";
                }
            }
            else if (node.Types.Count == 2 && node.Types[0] == "Maybe") {
                required = false;
                GetSchemaType(schema, node.Restrictions, node.Types[1]);
                if (schema.Type is null) {
                    MapReference(node.Types[0]);
                    schema.ExtensionData["$ref"] = $"#/references/{node.Types[1]}";
                }
            }
            else if (node.Types.Count == 2 && node.Types[0] == "List") {
                // do the list thing
                var listSchema =  new JSchema();
                GetSchemaType(listSchema, node.Restrictions, node.Types[1]);
                if (listSchema.Type is null) {
                    MapReference(node.Types[1]);
                    listSchema.ExtensionData["$ref"] = $"#/references/{node.Types[1]}";
                }
                schema.Items.Add(listSchema);
            }

            return (required, schema);

        }

        private (bool, JSchema) MapTypeAliasNode(TypeAliasNode node) {
            var required = true;
            var schema = new JSchema();
            schema.Title = node.Id;
            schema.Description = node.Description;

            if (node.Body.ExpressionKind == ExpressionKind.IdentifierExpression) {
                var idNode = (IdentifierNode)node.Body;
                GetSchemaType(schema, node.Restrictions, idNode.Id);
            }
            else if (node.Body.ExpressionKind == ExpressionKind.TypeApplicationExpression) {
                var parameters = ((TypeApplicationNode)node.Body).Parameters;
                var rootParam = parameters[0].Value;
                var first = parameters[1].Value;

                if (rootParam == "Maybe") {
                    required = false;
                    GetSchemaType(schema, node.Restrictions, first);
                }
            }
            
            return (required, schema);
        }


        private (bool, JSchema) MapDataNode(DataNode node) {
            var required = true;
            var schema = new JSchema();
            schema.Title = node.Id;
            schema.Description = node.Description;

            foreach (var option in node.Fields) {
                var fieldSchema = new JSchema();
                fieldSchema.Title = option.Id;
                GetSchemaType(fieldSchema, new List<RestrictionNode>(), option.Id);
                MapReference(option.Id);
                schema.OneOf.Add(fieldSchema);
                if (fieldSchema.Type is null)
                    fieldSchema.ExtensionData["$ref"] = $"#/references/{option.Id}";
            }

            return (required, schema);
        }

        private void GetSchemaType(JSchema schema, List<RestrictionNode> restrictions, string type) {
            var min = restrictions.FirstOrDefault(r => r.Key == "min");
            var max = restrictions.FirstOrDefault(r => r.Key == "max");
            var pattern = restrictions.FirstOrDefault(r => r.Key == "pattern");
            var decimals = restrictions.FirstOrDefault(r => r.Key == "decimals");

            var multipleOf = int.Parse(decimals?.Value ?? "2");
            var d = multipleOf switch {
                0 => 1d,
                1 => 0.1,
                2 => 0.01,
                3 => 0.001,
                4 => 0.0001,
                5 => 0.00001,
                6 => 0.000001,
                7 => 0.0000001,
                8 => 0.00000001,
                9 => 0.000000001,
                10 => 0.0000000001,
                _ => 0.00000000001
            };

            if (type == "String") {
                schema.Type = JSchemaType.String;
                schema.MinimumLength = min != null ? int.Parse(min.Value) : 1;
                schema.MaximumLength = max != null ? int.Parse(max.Value) : 100;
            }
            else if (type == "Number") {
                schema.Type = JSchemaType.Number;
                if (min != null) schema.Minimum = int.Parse(min.Value);
                if (max != null) schema.Maximum = int.Parse(max.Value);
            }
            else if (type == "Decimal") {
                schema.Type = JSchemaType.Number;
                if (min != null) schema.Minimum = int.Parse(min.Value);
                if (max != null) schema.Maximum = int.Parse(max.Value);
                schema.MultipleOf = d;
            }
            else if(type == "Boolean") {
                schema.Type = JSchemaType.Boolean;
            }
            else if (type == "Date") {
                schema.Type = JSchemaType.String;
                schema.Format = "date";
            }
            else if (type == "Time") {
                schema.Type = JSchemaType.String;
                schema.Format = "time";
            }
            else if (type == "DateTime") {
                schema.Type = JSchemaType.String;
                schema.Format = "date-time";
            }
            else {
                //MapReference(type);
                //schema.ExtensionData["$ref"] = $"#/references/{type}";
            }
        }
    

        private bool MapReference(string type) {

            if (type == "String" || type == "Number") return true;

            bool required = true;
            if (Lexicon.ContainsKey(type) && !References.ContainsKey(type)) {

                var result = MapBlock(Lexicon[type]);
                required = result.Item1;
                References[type] = result.Item2;
            }
            return required;
        }

        private (bool, JSchema) MapBlock(IIdentifierExpressionNode node) {
            if (References[node.Id] != null) {
#pragma warning disable CS8602 // Dereference of a possibly null reference.
                return (true, JSchema.Parse(References[node.Id].ToString()));
#pragma warning restore CS8602 // Dereference of a possibly null reference.
            }

            return node switch {
                RecordNode n => MapRecordNode(n),
                TypeAliasNode n => MapTypeAliasNode(n),
                DataNode n => MapDataNode(n),
                _ => throw new System.NotImplementedException(),
            };
        }

        public JSchema Transpile() {
            var (required, result) = MapBlock(this.Root);
            result.ExtensionData["references"] = References;
            return result;
        }
    }
}
