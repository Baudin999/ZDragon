using Compiler.Language.Nodes;
using System.Collections.Generic;
using System.Linq;


namespace Compiler.Checkers {
    public partial class TypeChecker {
        private void CheckTypeAliasNode(TypeAliasNode node) {

            HashSet<string> usedParams = new HashSet<string>();
            bodyChecker(node, node.Body, usedParams);

            // check if all the generic parameters are used
            foreach (var genericParameter in node.GenericParameters) {
                if (!usedParams.Contains(genericParameter.Value)) {
                    var error = new Error(ErrorType.GenericParameter_Unused, $"Unused generic parameter {genericParameter.Value}", genericParameter);
                    errorSink.AddError(error);
                }
            }
        }

        private void bodyChecker(TypeAliasNode root, ExpressionNode body, HashSet<string> usedParams) {
            
            switch (body) {
                case FunctionParameterNode n: CheckFunctionParameters(root, n, usedParams); break;
                case GenericParameterNode n: 
                    CheckToken(root, null, n.IdToken);
                    usedParams.Add(n.Id);
                    break;
                case IdentifierNode n: CheckToken(root, null, n.IdToken); break;
                default: break;
            }
        }

        private void CheckFunctionParameters(TypeAliasNode root, FunctionParameterNode node, HashSet<string> usedParams) {
            foreach (var n in node.Nodes) {
                bodyChecker(root, n, usedParams);
            }
        }



    }
}
