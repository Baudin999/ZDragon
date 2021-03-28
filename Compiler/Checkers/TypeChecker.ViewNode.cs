using Compiler.Language.Nodes;
using System;
using System.Linq;

namespace Compiler.Checkers {

    public partial class TypeChecker {

        private void CheckViewNode(ViewNode view) {
            if (!view.Imported) {

                // check if the view actually contains view elements.
                if (view.Nodes.Count == 0) {
                    errorSink.AddError(new Error(ErrorType.View_MissingFields, $@"
Views need fields. This view '{view.Id}' does not seem to contain any fields.
", view.Segment));

                }

                // foreach node check if that node exists in the dictionary
                foreach (var node in view.Nodes) {
                    var errors = CheckToken(view, null, node);
                    foreach (var error in errors) {
                        error.ErrorType = ErrorType.View_UnknownField;
                        errorSink.AddError(error);
                    }
                }

                // we will also want to check if every node in the view 
                // is of the same type. For example, if the first node 
                // is an IArchitecture node we'll want to ensure that every other
                // node is an IArchitecture node and the same for the 
                // ILanguageNode nodes.

                var key = view.Nodes.FirstOrDefault(n => lexicon.ContainsKey(n.Value))?.Value ?? null;
                var t = key == null ? null : lexicon[key];

                Type? nodeType = null;
                if (t is null) {
                    nodeType = null;
                }
                else if (t is ILanguageNode) {
                    nodeType = typeof(ILanguageNode);
                }
                else if (t is IArchitectureNode) {
                    nodeType = typeof(IArchitectureNode);
                }

                if (nodeType != null) {
                    foreach (var node in view.Nodes) {
                        lexicon.TryGetValue(node.Value, out IIdentifierExpressionNode? element);

                        if (element != null && !nodeType.IsAssignableFrom(element?.GetType())) {
                            // error
                            var td = nodeType is ILanguageNode ? "Language Element" : "Architectural Element";
                            var tp = nodeType is ILanguageNode ? "Architectural Element" : "Language Element";

                            errorSink.AddError(new Error(
                                ErrorType.View_WrongFieldType,
                                @$"Fields in a view should be of the same type.
The first element of the view list is a {td} but
the '{node.Value}' is a {tp}. 

You are not allowed to mix types in a view declaration.
",
                                node
                                ));
                        }
                    }
                }

            }
        }
    }
}
