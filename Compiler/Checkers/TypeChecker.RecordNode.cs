using Compiler.Language.Nodes;
using System.Linq;

namespace Compiler.Checkers {

    public partial class TypeChecker {

        private void CheckRecordNode(RecordNode node) {

            CheckTokens(node, null, node.Extensions);

            foreach (var field in node.Fields) {
                var root = field.TypeTokens.First();
                var id = root.Value;

                if (id == "Maybe") {
                    CheckMaybe(node, field, field.TypeTokens);
                }
                else if (id == "List") {
                    CheckList(node, field, field.TypeTokens);
                }
                else {
                    CheckTokens(node, field, field.TypeTokens);
                }
            }
        }
    }
}
