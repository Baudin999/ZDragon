using Compiler;
using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ZDragon.Transpilers.Components {
    public partial class ComponentTranspiler {
        private readonly Dictionary<string, IIdentifierExpressionNode> lexicon;
        private readonly Dictionary<string, string> types = new Dictionary<string, string>();
        private readonly Dictionary<string, string> relations = new Dictionary<string, string>();
        private HashSet<string> nonRootNodes = new HashSet<string>();
        private readonly List<string> containedComponents = new List<string>();
        private readonly List<string> reservedAttributes = new List<string> { "Name", "Version", "Status", "Title", "Description", "Contains", "Interactions", "Type" };
        private readonly List<string> reservedDeploymentAttributes = new List<string> { "Name", "Version", "Status", "Title", "Description", "Contains", "Interactions", "Type" };

        private static string GetDescription(AttributesNode node) {
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

                var arrow = "-->>";
                if (interactionParts.Count > 3) {
                    arrow = interactionParts[3].Trim().ToLower() switch {
                        "up" => "-UP->>",
                        "left" => "-LEFT->>",
                        "right" => "-RIGHT->>",
                        "down" => "-DOWN->>",
                        _ => "-->>"
                    };
                }

                if (lexicon.ContainsKey(interactionParts[0])) {
                    relations.TryAdd($"{node.Id}{interactionParts[0]}", $"Rel_({node.Id}, {interactionParts[0]}, {interactionParts[1]}, {interactionParts[2]}, {arrow})");
                }
            }
        }

       

        private static string ParseTags(AttributesNode node) {
            var _status = node.GetAttribute("Status", "").ToLower();
            //var _type = node.GetAttribute("Type", "").ToLower();

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

            var validParts = types.Where(kvp => !containedComponents.Contains(kvp.Key)).Select(kvp => kvp.Value).ToList();

            return @"
!include https://raw.githubusercontent.com/baudin999/C4-PlantUML/master/C4_Container.puml
!include https://raw.githubusercontent.com/baudin999/C4-PlantUML/master/C4_Deployment.puml

AddElementTag(""deprecated"", $bgColor=""#cc0000"", $fontColor=""#fff"", $borderColor=""#006700"")
AddElementTag(""new"", $bgColor=""#008000"", $fontColor=""#fff"", $borderColor=""#004d00"")
AddElementTag(""change"", $bgColor=""#e69500"", $fontColor=""#fff"", $borderColor=""#b37300"")


" +
                String.Join("\r\n", validParts) +
                "\r\n\r\n" +
                string.Join("\r\n", relations.Select(r => r.Value)) +
                "\r\n\r\nSHOW_DYNAMIC_LEGEND()";

        }
    }
}


/*
 * 
AddTagSupport(""deprecated"", $bgColor=""#7912F4"", $fontColor=""#FFFFFA"", $borderColor=""#026320"")
AddTagSupport(""new"", $bgColor=""#ad6800"", $fontColor=""#fff"", $borderColor=""#002808"")
AddTagSupport(""change"", $bgColor=""#990096"", $fontColor=""#fff"", $borderColor=""#593500"")

!include %get_variable_value(""RELATIVE_INCLUDE"")/C4_Container.puml
!include %get_variable_value(""RELATIVE_INCLUDE"")/C4_Deployment.puml
 */