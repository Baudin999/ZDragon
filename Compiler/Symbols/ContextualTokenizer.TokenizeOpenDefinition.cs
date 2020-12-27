using Compiler.Language.Nodes;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {


    /// <summary>
    /// 
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeOpenDefinition(List<Token> annotations) {
            var tokens = new List<Token?>();
            tokens.AddRange(annotations);
            while (index < max && Current?.Kind != SyntaxKind.SemiColonToken) {
                if (Current?.Kind == SyntaxKind.SingleQuoteToken && Next?.Kind == SyntaxKind.IdentifierToken) {
                    tokens.Add(new Token(new List<Token?> { Take(), Take() }, SyntaxKind.GenericParameterToken, 1));
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken && (Next?.Kind != SyntaxKind.IndentToken || Next == null)) {
                    Take(); // take the newline token
                    // end the context
                    break;
                }
                else if (Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.DotToken) {
                    var identifierParts = new List<Token?>();
                    while (Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.DotToken) {
                        identifierParts.Add(Take()); // add the part
                        Take(); // skip the dot
                    }
                    identifierParts.Add(Take());

                    tokens.Add(new QualifiedToken(identifierParts.OfType<Token>().ToList()));
                }
                else if (Current?.Kind == SyntaxKind.DoubleQuoteToken) {
                    tokens.Add(AggregateStringLiteralToken());
                }
                else if (Current?.Kind == SyntaxKind.IndentToken) {
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.SemiColonToken) {
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

            return new TokenGroup(ContextType.OpenDeclaration, tokens);
        }
    }
}
