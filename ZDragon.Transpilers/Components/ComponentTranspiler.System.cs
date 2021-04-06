using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ZDragon.Transpilers.Components {
    public partial class ComponentTranspiler {

        private void TranspileSystemNode(SystemNode node) {

            var type = node.GetAttribute("Type", "System");
            if (type == "Deployment") TranspileDeploymentNode(node);
            else {

                var systemParts = new List<string>();

                var name = node.GetAttribute("Title") ?? node.GetAttribute("Name") ?? node.Id;
                var description = GetDescription(node);
                var version = node.GetAttribute("Version", "0");
                var contains = node.GetAttributeItems("Contains") ?? new List<string>();

                var attribs = node
                    .Attributes
                    .Where(a => !reservedAttributes.Contains(a.Key))
                    .Where(a => a.Value.Length < 30)
                    .Select(a => $"AddProperty({a.Key}, {Compiler.Utilities.WordWrap(a.Value, 20)})");
                var attributes = string.Join("\n", attribs).Trim();
                if (attributes.Length > 0) attributes += "\n";

                var componentName = "System_Boundary";

                if (node.Imported) {
                    types.TryAdd(node.Id, $@"{componentName}({node.Id}, ""{name}"", ""v{version},system"")");
                }
                else if (contains.Count == 0 && !types.ContainsKey(node.Id)) {
                    types.TryAdd(node.Id, $@"{attributes}{componentName}({node.Id}, ""{name}"", ""v{version},system"")");
                }
                else {
                    systemParts.Add($@"{attributes}{componentName}({node.Id}, ""{name}"", ""{description}"") {{");

                    foreach (var c in contains) {
                        if (!types.ContainsKey(c) && this.lexicon.ContainsKey(c)) {
                            ParseNode((AttributesNode)this.lexicon[c]);
                        }
                        containedComponents.Add(c);
                    }

                    foreach (var c in contains) {
                        if (types.ContainsKey(c)) systemParts.Add(types[c]);
                    }

                    systemParts.Add("}");
                }

                if (!containedComponents.Contains(node.Id) && types.TryAdd(node.Id, string.Join("\r\n", systemParts))) {
                    // empty if
                }
                ParseInteractions(node);
            }
        }

        private void TranspileDeploymentNode(SystemNode node) {

            //"Label", "Optional Type", "Optional Description (with custom property header)"

            var systemParts = new List<string>();

            var name = node.GetAttribute("Title") ?? node.GetAttribute("Name") ?? node.Id;
            var description = GetDescription(node);
            var version = node.GetAttribute("Version", "0");
            var contains = node.GetAttributeItems("Contains") ?? new List<string>();
            var technology = node.GetAttribute("Technology", "container");

            var attribs = node
                .Attributes
                .Where(a => !reservedDeploymentAttributes.Contains(a.Key))
                .Where(a => a.Value.Length < 30)
                .Select(a => $"AddProperty({a.Key}, {Compiler.Utilities.WordWrap(a.Value, 20)})");
            var attributes = string.Join("\n", attribs).Trim();
            if (attributes.Length > 0) attributes += "\n";

            var componentName = "Deployment_Node";

            // add the root system parts
            systemParts.Add($@"{attributes}{componentName}({node.Id}, ""{name}"", ""v{version}, {technology}"", ""{description}"") {{");


            // foreach component inside of the system
            // add this component to the diagram
            foreach (var c in contains) {
                if (!types.ContainsKey(c) && this.lexicon.ContainsKey(c)) {
                    ParseNode((AttributesNode)this.lexicon[c]);
                }
                containedComponents.Add(c);
            }

            foreach (var c in contains) {
                if (types.ContainsKey(c)) systemParts.Add(types[c].Replace("Component(", "Container("));
            }

            // close the system parts
            systemParts.Add("}");

            types.TryAdd(node.Id, string.Join("\r\n", systemParts));

            ParseInteractions(node);
        }
    }
}
