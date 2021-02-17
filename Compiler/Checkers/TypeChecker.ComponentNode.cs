using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Checkers {

    public partial class TypeChecker {

        private void CheckComponentNode(ComponentNode node) {

            var interactions = node.Attributes.FirstOrDefault(a => a.Key == "Interactions")?.ItemsTokens ?? new List<List<Token>>();
            
            foreach (var interaction in interactions) {
                var token = interaction.Where(i => i.Kind == SyntaxKind.IdentifierToken).FirstOrDefault();
                if (token != null) {
                    CheckToken(node, null, token);
                }
            }
        }

       
    }
}
