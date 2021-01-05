using System.Collections.Generic;

namespace Compiler.Symbols {
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeAttributesDefinition(List<Token> annotations, ContextType contextType) {
            var tokens = new List<Token?>();
            var fieldStarted = false;

            while (!IsEndBlock()) {
                if (IsEndBlock(1)) {
                    if (fieldStarted) {
                        tokens.Add(new Token(SyntaxKind.AttributeFieldEnded));
                        fieldStarted = false;
                    }
                    tokens.Add(new Token(SyntaxKind.AttributeFieldStarted));
                    fieldStarted = true;
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken) {
                    Take();
                    tokens.Add(new Token(" ", SyntaxKind.WhiteSpaceToken, Token.DefaultSourceSegment()));
                }
                else if (Current?.Kind == SyntaxKind.IndentToken) {
                    Take();
                }
                else if (!fieldStarted && Current?.Kind == SyntaxKind.WhiteSpaceToken) {
                    Take();
                }
                else {
                    tokens.Add(Take());
                }
            }

            if (fieldStarted) {
                tokens.Add(new Token(SyntaxKind.AttributeFieldEnded));
                fieldStarted = false;
            }

            return new TokenGroup(contextType, tokens);
        }
    }
}
