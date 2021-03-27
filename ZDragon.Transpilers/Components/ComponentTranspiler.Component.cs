using Compiler.Language.Nodes;
using System.Linq;

namespace ZDragon.Transpilers.Components {
    public partial class ComponentTranspiler {

        private void TranspileComponent(ComponentNode node) {

            if (node.Imported) transpileImportedComponent(node);
            else transpileNonImportedComponent(node);


        }


        private void transpileImportedComponent(ComponentNode node) {
            var name = node.GetAttribute("Title") ?? node.GetAttribute("Name") ?? node.Id;
            var description = GetDescription(node);
            var tech = node.GetAttribute("Technology", "component");
            var version = node.GetAttribute("Version", "0");

            var type = node.GetAttribute("Type", "container").ToLower().Trim();
            var componentName = type switch {
                "database" => "ContainerDb_Ext",
                "db" => "ContainerDb_Ext",
                "queue" => "ContainerQueue_Ext",
                _ => "Container_Ext"
            };

            var attribs = node
                .Attributes
                .Where(a => !reservedAttributes.Contains(a.Key))
                .Where(a => a.Value.Length < 30)
                .Select(a => $"AddProperty({a.Key}, {Compiler.Utilities.WordWrap(a.Value, 20)})");
            var attributes = string.Join("\n", attribs).Trim();
            if (attributes.Length > 0) attributes += "\n";

            if (componentName != "Container_Ext") {
                types.TryAdd(node.Id, $@"
' COMPONENT: {node.Id}
{attributes}{componentName}({node.Id}, ""{name}"", ""v{version},{tech}"", ""[{type}]\n\n{description}""{ParseTags(node)})
' END COMPONENT: {node.Id}
");
            }
            else {
                types.TryAdd(node.Id, $@"
' COMPONENT: {node.Id}
{attributes}{componentName}({node.Id}, ""{name}"", ""v{version},{tech}"", ""{description}""{ParseTags(node)})
' END COMPONENT: {node.Id}
");

            }


        }

        private void transpileNonImportedComponent(ComponentNode node) {
            var name = node.GetAttribute("Title") ?? node.GetAttribute("Name") ?? node.Id;
            var description = GetDescription(node);
            var tech = node.GetAttribute("Technology", "component");
            var version = node.GetAttribute("Version", "0");

            var type = node.GetAttribute("Type", "container").ToLower().Trim();
            var componentName = type switch {
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

            if (componentName != "Container") {
                types.TryAdd(node.Id, $@"
' COMPONENT: {node.Id}
{attributes}{componentName}({node.Id}, ""{name}"", ""v{version},{tech}"", ""[{type}]\n\n{description}""{ParseTags(node)})
' END COMPONENT: {node.Id}
");

            }
            else {
                types.TryAdd(node.Id, $@"
' COMPONENT: {node.Id}
{attributes}{componentName}({node.Id}, ""{name}"", ""v{version},{tech}"", ""{description}""{ParseTags(node)})
' END COMPONENT: {node.Id}
");
            }
            ParseInteractions(node);


        }
    }
}
