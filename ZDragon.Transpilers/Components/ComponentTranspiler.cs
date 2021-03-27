using Compiler;
using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ZDragon.Transpilers.Components {
    public partial class ComponentTranspiler {
        private readonly Dictionary<string, IIdentifierExpressionNode> lexicon;
        private readonly List<string> baseTypes = new List<string> {
            "String", "Number", "Decimal", "Boolean", "Date", "Time", "DateTime", "Maybe", "List", "Either"
        };
        private readonly Dictionary<string, string> types = new Dictionary<string, string>();
        private readonly Dictionary<string, string> relations = new Dictionary<string, string>();
        private HashSet<string> nonRootNodes = new HashSet<string>();
        private readonly List<string> containedComponents = new List<string>();
        private readonly List<string> reservedAttributes = new List<string> { "Name", "Version", "Status", "Title", "Description", "Contains", "Interactions", "Type" };

        private string GetDescription(AttributesNode node) {
            return (node.GetAttribute("Description") ?? "").Replace(System.Environment.NewLine, " ");
        }

        

        private void TranspileEndpointNode(EndpointNode node) {
            var name = node.GetAttribute("Name") ?? node.Id;
            var description = GetDescription(node);
            var tech = node.GetAttribute("Technology", "endpoint");
            var version = node.GetAttribute("Version", "0");

            if (types.TryAdd(node.Id, $@"Container({node.Id}, ""{name}"", ""v{version},{tech}"", ""{description}""{ParseTags(node)})"))
                ParseInteractions(node);
        }

        private void TranspilePersonNode(PersonNode node) {
            var name = node.GetAttribute("Name") ?? node.Id;
            var description = GetDescription(node);

            if (types.TryAdd(node.Id, $@"Person({node.Id}, ""{name}"", """", ""{description}"")"))
                ParseInteractions(node);
        }

        

        private void ParseInteractions(AttributesNode node) {
            if (node.Imported) return;

            var interactions = node.GetAttributeItems("Interactions", new List<string>());
            foreach (var interaction in interactions) {
                var interactionParts = interaction.Split(";").ToList();
                while (interactionParts.Count < 3) {
                    interactionParts.Add("");
                }

                if (lexicon.ContainsKey(interactionParts[0])) {
                    relations.TryAdd($"{node.Id}{interactionParts[0]}", $"Rel({node.Id}, {interactionParts[0]}, {interactionParts[1]}, {interactionParts[2]})");
                }
            }
        }

       

        private string ParseTags(AttributesNode node) {
            var _status = node.GetAttribute("Status", "").ToLower();

            var _newTags = _status switch {
                "new" => $", $tags=\"new\"",
                "deprecated" => $", $tags=\"deprecated\"",
                "changed" => $", $tags=\"change\"",
                _ => ""
            };

            return _newTags;
        }


        public ComponentTranspiler(Dictionary<string, IIdentifierExpressionNode> lexicon) {
            this.lexicon = lexicon;
        }

        public ComponentTranspiler(CompilationResult result) {
            this.lexicon = result.Lexicon;
        }

        private void ParseNode(AttributesNode node) {
            switch (node) {
                case ComponentNode n: TranspileComponent(n); break;
                case EndpointNode n: TranspileEndpointNode(n); break;
                case PersonNode n: TranspilePersonNode(n); break;
                case SystemNode n: TranspileSystemNode(n); break;
                case InteractionNode n: TranspileInteractionNode(n); break;
                default: break;
            }
        }

        public string Transpile() {

            var items = this
                .lexicon
                .Values
                .OfType<AttributesNode>()
                .OrderByDescending(n => n.GetAttributeItems("Contains", new List<string>()).Count);

            nonRootNodes =
                    this.lexicon
                    .Values
                    .OfType<AttributesNode>()
                    .SelectMany(n => n.GetAttributeItems("Contains", new List<string>()))
                    .ToHashSet();


            foreach (IIdentifierExpressionNode node in items) {
                ParseNode((AttributesNode)node);
            };


            // && !nonRootNodes.Contains(kvp.Key)
            var validParts = types.Where(kvp => !containedComponents.Contains(kvp.Key)).Select(kvp => kvp.Value).ToList();

            return @"
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml
!define FONTAWESOME https://raw.githubusercontent.com/tupadr3/plantuml-icon-font-sprites/master/font-awesome-5


AddTagSupport(""deprecated"", $bgColor=""#7912F4"", $fontColor=""#FFFFFA"", $borderColor=""#026320"")
AddTagSupport(""new"", $bgColor=""#ad6800"", $fontColor=""#fff"", $borderColor=""#002808"")
AddTagSupport(""change"", $bgColor=""#990096"", $fontColor=""#fff"", $borderColor=""#593500"")


" +
                String.Join("\r\n", validParts) +
                "\r\n\r\n" +
                string.Join("\r\n", relations.Select(r => r.Value)) +
                "\r\n\r\nSHOW_DYNAMIC_LEGEND()";
        }
    }
}
