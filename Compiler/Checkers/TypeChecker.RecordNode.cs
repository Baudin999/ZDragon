using Compiler.Language.Nodes;
using System.Linq;

namespace Compiler.Checkers {

    public partial class TypeChecker {

        private void CheckRecordNode(RecordNode node) {

            var extension_errors = CheckTokens(node, null, node.Extensions);

            foreach (var field in node.Fields) {
                var root = field.TypeTokens.First();
                var id = root.Value;

                if (id == "Maybe") {
                    errorSink.Errors.AddRange(CheckMaybe(node, field, field.TypeTokens));
                }
                else if (id == "List") {
                    errorSink.Errors.AddRange(CheckList(node, field, field.TypeTokens));
                }
                else {
                    var errors = CheckTokens(node, field, field.TypeTokens);
                    foreach (var error in errors) {
                        if (error.ErrorType == ErrorType.Unknown) {
                            error.ErrorType = ErrorType.Record_UnknownFieldType;
                            error.Message = $@"
On record '{node.Id}' we've encountered an unknown field type:
    {field}
";
                        }
                        errorSink.Errors.Add(error);
                    }
                }
            }

            foreach (var extension in node.Extensions) {
                // get the type
                if (this.lexicon.ContainsKey(extension.Value)) {
                    var ext = this.lexicon[extension.Value];

                    // add the fields
                    if (ext is RecordNode rn) {
                        foreach (var field in rn.Fields) {
                            if (!node.Fields.Any(f => f.Id == field.Id)) {
                                node.Fields.Add(field.Clone());
                            }
                        }
                    }
                }
            }
        }
    }
}
