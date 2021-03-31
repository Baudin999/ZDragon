using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {


    /// <summary>
    ///
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeMarkupDefinition() {
            var tokens = new List<Token?>();
            while (index < max && Current != null) {
                if (Current.Kind == SyntaxKind.ForwardSlashToken && Next?.Kind == SyntaxKind.GreaterThenToken) {
                    // />  Closing symbol
                    tokens.Add(new Token(new List<Token> { TakeF(), TakeF() }, SyntaxKind.CloseMarkupElement));
                }
                else if (Current.Kind == SyntaxKind.LessThenToken && Next?.Kind == SyntaxKind.ForwardSlashToken) {
                    //  </ Closing
                    var closingTokens = TakeWhile(t => t.Kind != SyntaxKind.GreaterThenToken).OfType<Token>().ToList();
                    tokens.Add(new Token(closingTokens, SyntaxKind.CloseMarkupElement));
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
                else if (Current?.Kind == SyntaxKind.CommentLiteral) {
                    Take();
                }
                else {
                    tokens.Add(Take());
                }
            }
            
            return new TokenGroup(ContextType.MarkupDeclaration, (IEnumerable<Token>)tokens);
        }
    }
}
