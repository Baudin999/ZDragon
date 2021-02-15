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

        private void TranspileComponent(ComponentNode node) {
            var name = node.GetAttribute("Name");
            var description = node.GetAttribute("Description");
            var tech = node.GetAttribute("Technology", "component");

            types.Add($@"Container({node.Id}, ""{node.Id}"", ""{tech}"", ""{description}"")");
        }

        private void TranspileEndpointNode(EndPointNode node) {
            var name = node.GetAttribute("Name");
            var description = node.GetAttribute("Description");
            var tech = node.GetAttribute("Technology", "endpoint");

            types.Add($@"Container({node.Id}, ""{node.Id}"", ""{tech}"", ""{description}"")");
        }


        public ComponentTranspiler(CompilationResult compilationresult) {
            this.compilationresult = compilationresult;
        }

        public string Transpile() {

            // check all the types
            foreach (var node in this.compilationresult.Ast) {
                switch (node) {
                    case ComponentNode n: TranspileComponent(n); break;
                    case EndPointNode n: TranspileEndpointNode(n); break;
                    default: break;
                }
            };

            return @"
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
!define FONTAWESOME https://raw.githubusercontent.com/tupadr3/plantuml-icon-font-sprites/master/font-awesome-5

LAYOUT_WITH_LEGEND()


" +
                String.Join("\r\n", types) +
                "\r\n\r\n" +
                string.Join("\r\n", relations);
        }
    }
}
