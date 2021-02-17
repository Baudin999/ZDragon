using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Checkers {

    public partial class TypeChecker {

        private void CheckEndpointNode(EndpointNode node) {
            // check the function body of the endpoint
            // by reusing the type checker of the "TypeAliasNode"
            if (node.TypeDefinition != null) {
                HashSet<string> usedParams = new HashSet<string>();
                bodyChecker(node, node.TypeDefinition, usedParams);
            }
        }
    }
}
