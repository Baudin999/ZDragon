using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Symbols {


    /// <summary>
    ///  
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeRecordDefinition(List<Token> annotations) {
            var tokens = new List<Token>();
            tokens.AddRange(annotations);
            while (index < max && Current != null && Current?.Kind != SyntaxKind.EndKeywordToken) {
                if (Current?.Kind == SyntaxKind.MinusToken && Next?.Kind == SyntaxKind.GreaterThenToken) {
                    tokens.Add(new Token(new List<Token> { Take(), Take() }, SyntaxKind.NextParameterToken, 1));
                }
                else if (Current?.Kind == SyntaxKind.SingleQuoteToken && Next?.Kind == SyntaxKind.IdentifierToken) {
                    tokens.Add(new Token(new List<Token> { Take(), Take() }, SyntaxKind.GenericParameterToken, 1));
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken && Next?.Kind == SyntaxKind.NewLineToken) {
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken && (Next?.Kind != SyntaxKind.IndentToken || Next == null)) {
                    // end the context
                    break;
                }
                else if (Current?.Kind == SyntaxKind.DoubleQuoteToken) {
                    tokens.Add(AggregateStringLiteralToken());
                }
                else if (Current?.Kind == SyntaxKind.AmpersandToken) {
                    tokens.Add(ParseAnnotation());
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
                else {
                    tokens.Add(Take());
                }
            }

            if (Current?.Kind == SyntaxKind.SemiColonToken) {
                tokens.Add(Take());
            }

            if (Current?.Kind == SyntaxKind.EndKeywordToken) {
                Take();
            }

            return new TokenGroup(ContextType.RecordDeclaration, tokens);
        }
    }
}
