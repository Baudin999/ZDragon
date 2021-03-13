using Compiler;
using Compiler.Language.Nodes;
using Compiler.Symbols;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ZDragon.Transpilers.PlantUML {
    public class ClassDiagramTranspiler {
        //private readonly CompilationResult compilationresult;
        private readonly List<string> baseTypes = new List<string> {
            "String", "Number", "Decimal", "Boolean", "Date", "Time", "DateTime", "Maybe", "List", "Either"
        };
        private readonly List<string> types = new List<string>();
        private readonly List<string> relations = new List<string>();
        private readonly Dictionary<string, IIdentifierExpressionNode> lexicon;

        private void TranspileTypeAliasNode(TypeAliasNode node) {

            if (node.Body is FunctionParameterNode fpn) {
                // do function parameter
                types.Add($@"
class {node.Id} <<function>> {{
    {node.Id} :: {fpn};
}}
");
                foreach (var paramNode in fpn.Nodes) {
                    if (paramNode is IdentifierNode idNode && !baseTypes.Contains(idNode.Id)) {
                        relations.Add($"{node.Id} --* {idNode.Id}");
                    }
                    else if (paramNode is TypeApplicationNode tan) {
                        foreach (var tanNode in tan.Parameters) {
                            if (!baseTypes.Contains(tanNode.Value)) {
                                relations.Add($"{node.Id} --* {tanNode.Value}");
                            }
                        }
                    }
                    else if (paramNode is FunctionParameterNode fpnNode) {
                        //
                    }
                }
            }
            else {
                types.Add($@"
interface {node.Id} {{}}
");
            }
        }
        private void TranspileRecordNode(RecordNode node) {
            var fields = node.Fields.OrderBy(f => f.Id).Select(f => $"{(f.IsCloned ? "{classifier} " : "")}{f.Id}: {string.Join(" ", f.Types)};");
            types.Add($@"
class {node.Id} {{
    {string.Join("\r\n\t", fields)}
}}
");

            foreach (var field in node.Fields) {
                foreach (var t in field.Types) {
                    if (t.StartsWith("'")) {
                        // do nothing 
                        // we might want to treat generic parameters differently in the future.
                    }
                    else if (!baseTypes.Contains(t)) {
                        if (field.IsList) {
                            var min = field.Restrictions.FirstOrDefault(r => r.Key == "min")?.Value ?? "0";
                            var max = field.Restrictions.FirstOrDefault(r => r.Key == "max")?.Value ?? "*";
                            relations.Add($"{node.Id} \"{1}\" -- \"{min}-{max}\" {t}");
                        }
                        else {
                            relations.Add($"{node.Id} -- {t}");
                        }
                    }
                }
            }

            foreach (var extension in node.Extensions) {
                if (extension is QualifiedToken qt) {
                    relations.Add($"{node.Id} --|> {qt.QualifiedName}");
                } else {
                    relations.Add($"{node.Id} --|> {extension.Value}");
                }
            }
        }
        private void TranspileDataNode(DataNode node) {
            var fields = node.Fields.Select(f => $"{string.Join(" ", f.Types)}");
            types.Add($@"
abstract class {node.Id} {{
    {string.Join("\r\n\t", fields)}
}}
");
            foreach (var field in node.Fields) {
                var t = field.Types.Last();
                if (!baseTypes.Contains(t)) {
                    relations.Add($"{node.Id} --* {t}");
                }
                
            }
        }
        private void TranspileChoiceNode(ChoiceNode node) {
            types.Add($@"
enum {node.Id} {{
    {string.Join("\r\n\t", node.Fields.Select(f => f.Value))}
}}
");
        }


        public ClassDiagramTranspiler(Dictionary<string, IIdentifierExpressionNode> lexicon) {
            this.lexicon = lexicon;
        }
            
        public string Transpile() {
            
            // check all the types
            foreach (var node in lexicon.Values) {
                switch (node) {
                    case TypeAliasNode n: TranspileTypeAliasNode(n); break;
                    case RecordNode n: TranspileRecordNode(n); break;
                    case DataNode n: TranspileDataNode(n); break;
                    case ChoiceNode n: TranspileChoiceNode(n); break;
                    default: break;
                }
            };

            return "!define LIGHTBLUE\r\n" +
                "!includeurl https://raw.githubusercontent.com/Drakemor/RedDress-PlantUML/master/style.puml \r\n" +
                String.Join("\r\n", types) + 
                "\r\n\r\n" + 
                string.Join("\r\n", relations);
        }
    }
}
