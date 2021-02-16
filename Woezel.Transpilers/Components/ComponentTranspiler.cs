using Compiler;
using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Woezel.Transpilers.Components {
    public class ComponentTranspiler {
        private readonly CompilationResult compilationresult;
        private readonly List<string> baseTypes = new List<string> {
            "String", "Number", "Decimal", "Boolean", "Date", "Time", "DateTime", "Maybe", "List", "Either"
        };
        private readonly List<string> types = new List<string>();
        private readonly List<string> relations = new List<string>();
        private readonly List<string> containedComponents = new List<string>();



        private void TranspileComponent(ComponentNode node) {
            if (containedComponents.Contains(node.Id)) return;

            var name = node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description") ?? "";
            var tech = node.GetAttribute("Technology", "component");
            var version = node.GetAttribute("Version", "0");

            types.Add($@"Container({node.Id}, ""{name}"", ""v{version},{tech}"", ""{description}"")");

            var interactions = node.GetAttributeItems("Interactions", new List<string>());
            foreach (var interaction in interactions) {
                relations.Add($"Rel({node.Id}, {interaction}, \"\", \"\")");
            }
        }

        private void TranspileEndpointNode(EndPointNode node) {
            if (containedComponents.Contains(node.Id)) return;

            var name = node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description") ?? "";
            var tech = node.GetAttribute("Technology", "endpoint");
            var version = node.GetAttribute("Version", "0");

            types.Add($@"Container({node.Id}, ""{name}"", ""v{version},{tech}"", ""{description}"")");

            var interactions = node.GetAttributeItems("Interactions", new List<string>());
            foreach (var interaction in interactions) {
                relations.Add($"Rel({node.Id}, {interaction}, \"\", \"\")");
            }
        }

        private void TranspilePersonNode(PersonNode node) {
            if (containedComponents.Contains(node.Id)) return;

            var name = node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description") ?? "";

            types.Add($@"Person({node.Id}, ""{name}"", """", ""{description}"")");

            var interactions = node.GetAttributeItems("Interactions", new List<string>());
            foreach (var interaction in interactions) {
                relations.Add($"Rel({node.Id}, {interaction}, \"Uses\", \"HTTP(S)\")");
            }
        }

        private void TranspileSystemNode(SystemNode node) {
            var name = node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description") ?? "";
            var version = node.GetAttribute("Version", "0");
            var contains = node.GetAttributeItems("Contains") ?? new List<string>();

            if (contains.Count() == 0) {
                types.Add($@"System_Boundary({node.Id}, ""{name}"", ""v{version},system"")");
            }
            else {
                var systemParts = new List<string> {
                    $@"System_Boundary({node.Id}, ""{name}"", ""{description}"") {{"
                };
                
                foreach (var c in contains) {
                    var container = (AttributesNode)this.compilationresult.Ast.OfType<IIdentifierExpressionNode>().FirstOrDefault(n => n.Id == c);
                    if (container is null) continue;

                    var _name = container.GetAttribute("Name");
                    var _description = container.GetAttribute("Description");
                    var _tech = container.GetAttribute("Technology");
                    var ver = node.GetAttribute("Version", "0");

                    if (_tech is null && container is EndPointNode) _tech = "endpoint";
                    if (_tech is null && container is SystemNode) _tech = "system";
                    if (_tech is null && container is ComponentNode) _tech = "component";

                    var componentType = "Container";

                    systemParts.Add($@"{componentType}({container.Id}, ""{_name}"", ""v{ver},{_tech}"", ""{_description}"")");

                    var interactions = container.GetAttributeItems("Interactions", new List<string>());
                    foreach (var interaction in interactions) {
                        relations.Add($"Rel({container.Id}, {interaction}, \"\", \"\")");
                    }
                }

                systemParts.Add("}");

                types.Add(string.Join("\n", systemParts));
            }
        }


        public ComponentTranspiler(CompilationResult compilationresult) {
            this.compilationresult = compilationresult;
        }

        private (string, List<string>) TranspileNode(AttributesNode node) {
            var _name = node.GetAttribute("Name");
            var _description = node.GetAttribute("Description");
            var _tech = node.GetAttribute("Technology", "component");
            var version = node.GetAttribute("Version", "0");

            if (node is EndPointNode) _tech = "endpoint";
            if (node is SystemNode) _tech = "system";

            var componentType = "Container";

            var text = $@"{componentType}({node.Id}, ""{_name}"", ""v{version},{_tech}"", ""{_description}"")";
            var links = new List<string>();
            var interactions = node.GetAttributeItems("Interactions") ?? new List<string>() ;
            foreach (var interaction in interactions) {
                links.Add($"Rel({node.Id}, {interaction}, \"\", \"\")");
            }

            return (text, links);
        }

        public string Transpile() {

            // all components which are contained in a "System_Boundary".
            containedComponents.Clear();
            containedComponents.AddRange( 
                this.compilationresult
                    .Ast
                    .OfType<SystemNode>()
                    .SelectMany(n => n.GetAttributeItems("Contains", new List<string>()))
                    .ToList()
                );


            // check all the types
            foreach (var node in this.compilationresult.Ast) {
                switch (node) {
                    case ComponentNode n: TranspileComponent(n); break;
                    case EndPointNode n: TranspileEndpointNode(n); break;
                    case PersonNode n: TranspilePersonNode(n); break;
                    case SystemNode n: TranspileSystemNode(n); break;
                    default: break;
                }
            };

            return @"
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
!define FONTAWESOME https://raw.githubusercontent.com/tupadr3/plantuml-icon-font-sprites/master/font-awesome-5

" +
                String.Join("\r\n", types) +
                "\r\n\r\n" +
                string.Join("\r\n", relations) +
                "\r\n\r\nSHOW_DYNAMIC_LEGEND()";
        }
    }
}
