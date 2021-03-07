using Compiler;
using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ZDragon.Transpilers.Components {
    public class ComponentTranspiler {
        private readonly Dictionary<string, IIdentifierExpressionNode> lexicon;
        private readonly List<string> baseTypes = new List<string> {
            "String", "Number", "Decimal", "Boolean", "Date", "Time", "DateTime", "Maybe", "List", "Either"
        };
        private readonly Dictionary<string, string> types = new Dictionary<string, string>();
        private readonly List<string> parts = new List<string>();
        private readonly List<string> relations = new List<string>();
        private readonly List<string> containedComponents = new List<string>();
        private readonly List<string> reservedAttributes  = new List<string> { "Name", "Version", "Status", "Title", "Description", "Contains", "Interactions", "Type" };

        private void TranspileComponent(ComponentNode node) {
            var name = node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description") ?? "";
            var tech = node.GetAttribute("Technology", "component");
            var version = node.GetAttribute("Version", "0");

            var type = node.GetAttribute("Type", "container").ToLower().Trim();
            var componentType = type switch {
                "database" => "ContainerDb",
                "db" => "ContainerDb",
                "queue" => "ContainerQueue",
                _ => "Container"
            };

            var attribs = node
                .Attributes
                .Where(a => !reservedAttributes.Contains(a.Key))
                .Where(a => a.Value.Length < 30)
                .Select(a => $"AddProperty({a.Key}, {Compiler.Utilities.WordWrap(a.Value, 20)})");
            var attributes = string.Join("\n", attribs).Trim();
            if (attributes.Length > 0) attributes += "\n";

            if (componentType != "Container") {
                if (types.TryAdd(node.Id, $@"
' COMPONENT: {node.Id}
{attributes}{componentType}({node.Id}, ""{name}"", ""v{version},{tech}"", ""[{type}]\n\n{description}""{ParseTags(node)})
' END COMPONENT: {node.Id}
"))
                    ParseInteractions(node);
            }
            else {
                if (types.TryAdd(node.Id, $@"
' COMPONENT: {node.Id}
{attributes}{componentType}({node.Id}, ""{name}"", ""v{version},{tech}"", ""{description}""{ParseTags(node)})
' END COMPONENT: {node.Id}
"))
                    ParseInteractions(node);
            }
        }

        private void TranspileEndpointNode(EndpointNode node) {
            var name = node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description") ?? "";
            var tech = node.GetAttribute("Technology", "endpoint");
            var version = node.GetAttribute("Version", "0");

            if (types.TryAdd(node.Id, $@"Container({node.Id}, ""{name}"", ""v{version},{tech}"", ""{description}""{ParseTags(node)})"))
                ParseInteractions(node);
        }

        private void TranspilePersonNode(PersonNode node) {
            var name = node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description") ?? "";

            if (types.TryAdd(node.Id, $@"Person({node.Id}, ""{name}"", """", ""{description}"")"))
                ParseInteractions(node);
        }

        private void TranspileSystemNode(SystemNode node) {
            var systemParts = new List<string>();

            var name = node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description") ?? "";
            var version = node.GetAttribute("Version", "0");
            var contains = node.GetAttributeItems("Contains") ?? new List<string>();

            var attribs = node
                .Attributes
                .Where(a => !reservedAttributes.Contains(a.Key))
                .Where(a => a.Value.Length < 30)
                .Select(a => $"AddProperty({a.Key}, {Compiler.Utilities.WordWrap(a.Value, 20)})");
            var attributes = string.Join("\n", attribs).Trim();
            if (attributes.Length > 0) attributes += "\n";


            var type = node.GetAttribute("Type", "System");
            var componentName = type switch {
                "System" => "System_Boundary",
                "Deployment" => "Deployment_Node",
                _ => "System_Boundary"
            };

            if (contains.Count == 0) {
                types.Add(node.Id, $@"{attributes}{componentName}({node.Id}, ""{name}"", ""v{version},system"", """")");
            }
            else {
                systemParts.Add($@"{attributes}{componentName}({node.Id}, ""{name}"", ""{description}"", """") {{");

                foreach (var c in contains) {
                    if (!types.ContainsKey(c) && this.lexicon.ContainsKey(c)) {
                        ParseNode((AttributesNode)this.lexicon[c]);
                        containedComponents.Add(c);
                    }
                    if (types.ContainsKey(c)) systemParts.Add(types[c]);
                }

                systemParts.Add("}");
            }

            if (types.TryAdd(node.Id, string.Join("\r\n", systemParts))) {
                ParseInteractions(node);
            }
        }

        private void ParseInteractions(AttributesNode node) {
            var interactions = node.GetAttributeItems("Interactions", new List<string>());
            foreach (var interaction in interactions) {
                var interactionParts = interaction.Split(";").ToList();
                while (interactionParts.Count < 3) {
                    interactionParts.Add("");
                }

                if (lexicon.ContainsKey(interactionParts[0])) {
                    relations.Add($"Rel({node.Id}, {interactionParts[0]}, {interactionParts[1]}, {interactionParts[2]})");
                }
            }
        }

        private void TranspileInteractionNode(InteractionNode node) {
            var from = node.GetAttribute("From");
            var to = node.GetAttribute("To");
            var tech = node.GetAttribute("Technology", "\"\"");
            var title = node.GetAttribute("Title");
            var name = node.GetAttribute("Name");
            var description = node.GetAttribute("Description");
            var direction = node.GetAttribute("Direction", "");

            var _status = node.GetAttribute("Status", "").ToLower();

            var _relColor = _status switch {
                "new" => "-[#ad6800]->",
                "deprecated" => "-[#750103]->",
                "changed" => "-[#990096]->",
                "modified" => "-[#990096]->",
                _ => "-[#353535]->"
            };

            var d = direction switch {
                "Up" => "Rel_U",
                "Down" => "Rel_D",
                "Left" => "Rel_L",
                "Right" => "Rel_R",
                _ => "Rel_"
            };

            if (from != null && to != null && d == "Rel_") {
                relations.Add($"{d}({from}, {to}, {title ?? name ?? description ?? node.Id}, {tech}, {_relColor})");
            }
            else if (from != null && to != null) {
                relations.Add($"{d}({from}, {to}, {title ?? name ?? description ?? node.Id}, {tech})");
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

        public ComponentTranspiler(Compiler.Index index) {
            var lex = new Dictionary<string, IIdentifierExpressionNode>();
            foreach (var i in index) {
                lex.Add(i.Key, i.Node);
            }
            this.lexicon = lex;
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

            var items = this.lexicon.Values.OfType<AttributesNode>().OrderByDescending(n => n.GetAttributeItems("Contains", new List<string>()).Count);
            foreach (IIdentifierExpressionNode node in items) {
                ParseNode((AttributesNode)node);
            };


            var fff = types.Where(kvp => !containedComponents.Contains(kvp.Key)).Select(kvp => kvp.Value).ToList();

            return @"
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml
!define FONTAWESOME https://raw.githubusercontent.com/tupadr3/plantuml-icon-font-sprites/master/font-awesome-5


AddTagSupport(""deprecated"", $bgColor=""#750103"", $fontColor=""#fff"", $borderColor=""#280000"")
AddTagSupport(""new"", $bgColor=""#ad6800"", $fontColor=""#fff"", $borderColor=""#002808"")
AddTagSupport(""change"", $bgColor=""#990096"", $fontColor=""#fff"", $borderColor=""#593500"")


" +
                String.Join("\r\n", fff) +
                "\r\n\r\n" +
                string.Join("\r\n", relations) +
                "\r\n\r\nSHOW_DYNAMIC_LEGEND()";
        }
    }
}
