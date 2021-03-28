using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Symbols {


    /// <summary>
    /// 
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeChoiceDefinition(List<Token> annotations) {
            var tokens = new List<Token?>();
            tokens.AddRange(annotations);
            while (index < max && Current != null && Current?.Kind != SyntaxKind.EndBlock) {
                if (Current?.Kind == SyntaxKind.SingleQuoteToken && Next?.Kind == SyntaxKind.IdentifierToken) {
                    tokens.Add(new Token(new List<Token> { TakeF(), TakeF() }, SyntaxKind.GenericParameterToken, 1));
                }
                else if (Current?.Kind == SyntaxKind.EndBlock) {
                    Take();
                    break;
                }

                // handle inline annotations
                else if (Current?.Kind == SyntaxKind.AmpersandToken) {
                    tokens.Add(ParseAnnotation());
                }

                else if (Current?.Kind == SyntaxKind.DoubleQuoteToken) {
                    tokens.Add(AggregateStringLiteralToken());
                }
                else if (Current?.Kind == SyntaxKind.IndentToken) {
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.WhiteSpaceToken) {
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken) {
                    Take();
                }

                // Skip contextual Tokens
                else if (Current?.Kind == SyntaxKind.ContextualIndent1) {
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.ContextualIndent2) {
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.ContextualIndent3) {
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.ContextualIndent4) {
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.ContextualIndent5) {
                    Take();
                }

                else {
                    tokens.Add(Take());
                }
            }


            if (Current?.Kind == SyntaxKind.EndBlock) {
                tokens.Add(Take());
            }

            return new TokenGroup(ContextType.ChoiceDeclaration, tokens);
        }
    }
}
