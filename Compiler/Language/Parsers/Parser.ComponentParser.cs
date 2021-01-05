using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        internal ExpressionNode ParseComponent() {
            var start = Take(SyntaxKind.ComponentDeclarationToken);
            var name = Take(SyntaxKind.IdentifierToken);
            Token end = name;

            var attributes = new List<AttributeNode>();
            if (Current?.Kind == SyntaxKind.EqualsToken) {
                Take(SyntaxKind.EqualsToken);

                while (Current?.Kind == SyntaxKind.AttributeFieldStarted) {
                    Take(); // attribute field started

                    var fieldName = Take();
                    Take(SyntaxKind.ColonToken);
                    var fieldDescription = 
                            TakeWhile(t => t.Kind != SyntaxKind.AttributeFieldEnded)
                                .OfType<Token>()
                                .ToList();

                    attributes.Add(new AttributeNode(fieldName, fieldDescription));

                    end = Take(); // attribute field ended
                }
            }

            return new ComponentNode(Token.Range(start, end), name, attributes);
        }
    }
}
