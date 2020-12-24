using Compiler;
using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Woezel.Transpilers.PlantUML {
    public class Transpiler {
        private readonly CompilationResult compilationresult;
        private readonly List<string> baseTypes = new List<string> {
            "String", "Number", "Decimal", "Boolean", "Date", "Time", "DateTime", "Maybe", "List", "Either"
        };
        private readonly List<string> types = new List<string>();
        private readonly List<string> relations = new List<string>();

        private void TranspileTypeAliasNode(TypeAliasNode node) {
            types.Add($@"
class {node.Id} {{}}
");
        }
        private void TranspileRecordNode(RecordNode node) {
            var fields = node.Fields.Select(f => $"{f.Id}:{string.Join(" ", f.Types)};");
            types.Add($@"
class {node.Id} {{
    {string.Join("\r\n\t", fields)}
}}
");

            foreach (var field in node.Fields) {
                foreach (var t in field.Types) {
                    if (!baseTypes.Contains(t)) {
                        relations.Add($"{node.Id} -- {t}");
                    }
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


        public Transpiler(CompilationResult compilationresult) {
            this.compilationresult = compilationresult;
        }

        public string Transpile() {
            
            // check all the types
            foreach (var node in this.compilationresult.Ast) {
                switch (node) {
                    case TypeAliasNode n: TranspileTypeAliasNode(n); break;
                    case RecordNode n: TranspileRecordNode(n); break;
                    case DataNode n: TranspileDataNode(n); break;
                    case ChoiceNode n: TranspileChoiceNode(n); break;
                    default: break;
                }
            };

            return "!define DARKBLUE\r\n" +
                "!includeurl https://raw.githubusercontent.com/Drakemor/RedDress-PlantUML/master/style.puml \r\n" +
                String.Join("\r\n", types) + 
                "\r\n" + 
                string.Join("\r\n", relations);
        }
    }
}
