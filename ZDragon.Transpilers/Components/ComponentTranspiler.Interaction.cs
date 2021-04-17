using Compiler.Language.Nodes;
using System;
using System.Linq;

namespace ZDragon.Transpilers.Components {
    public partial class ComponentTranspiler {

        private void TranspileInteractionNode(InteractionNode node) {
            var from = node.GetAttribute("From");
            var to = node.GetAttribute("To");
            var tech = node.GetAttribute("Technology", "\"\"");
            var title = node.GetAttribute("Title");
            var name = node.GetAttribute("Name");
            var description = GetDescription(node);
            var direction = node.GetAttribute("Direction", "");
            var hidden = bool.Parse(node.GetAttribute("Hidden", "False").ToLower());

            var _status = node.GetAttribute("Status", "").ToLower();

            var _relColor = _status switch {
                "new" => "-[#ad6800]->",
                "deprecated" => "-[#750103]->",
                "changed" => "-[#990096]->",
                "modified" => "-[#990096]->",
                _ => "-[#353535]->"
            };


            var d = "Rel_";

            if (hidden) {
                d = direction switch {
                    "Up" => "Lay_U",
                    "Down" => "Lay_D",
                    "Left" => "Lay_L",
                    "Right" => "Lay_R",
                    _ => "Rel_"
                };
                relations.TryAdd($"{from}{to}_{new Guid()}", $"{d}({from}, {to})");
            }
            else {
                d = direction switch {
                    "Up" => "Rel_U",
                    "Down" => "Rel_D",
                    "Left" => "Rel_L",
                    "Right" => "Rel_R",
                    _ => "Rel_"
                };

                if (from != null && to != null && d == "Rel_") {
                    relations.TryAdd($"{from}{to}", $"{d}({from}, {to}, {title ?? name ?? description ?? node.Id}, {tech}, {_relColor})");
                }
                //else if (from != null && to != null && direction == "Down") {
                //    var color = $"-[#de214c]DOWN-|>";
                //    relations.TryAdd($"{from}{to}", $"Rel_D({from}, {to}, {title ?? name ?? description ?? node.Id}, {tech}, {color})");
                //}
                else if (from != null && to != null) {
                    relations.TryAdd($"{from}{to}", $"{d}({from}, {to}, {title ?? name ?? description ?? node.Id}, {tech})");
                }
            }


        }
    }
}
