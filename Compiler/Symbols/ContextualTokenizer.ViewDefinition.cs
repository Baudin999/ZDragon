using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Symbols {


    /// <summary>
    /// 
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeViewDefinition(List<Token> annotations) {
            var fieldStarted = false;
            var tokens = new List<Token?>();
            tokens.AddRange(annotations);
            while (index < max && Current != null && Current?.Kind != SyntaxKind.EndKeywordToken) {
                if (Current?.Kind == SyntaxKind.SingleQuoteToken && Next?.Kind == SyntaxKind.IdentifierToken) {
                    tokens.Add(new Token(new List<Token> { TakeF(), TakeF() }, SyntaxKind.GenericParameterToken, 1));
                }
                else if (Current?.Kind == SyntaxKind.EndBlock) {
                    Take();
                    break;
                }
                else if (Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.DotToken) {
                    var identifierParts = new List<Token>();
                    while (Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.DotToken) {
                        identifierParts.Add(TakeF(SyntaxKind.IdentifierToken)); // add the part
                        Take(); // skip the dot
                    }
                    identifierParts.Add(TakeF(SyntaxKind.IdentifierToken));

                    tokens.Add(new QualifiedToken(identifierParts));
                }
                else if (Current?.Kind == SyntaxKind.DoubleQuoteToken) {
                    tokens.Add(AggregateStringLiteralToken());
                }
                else if (Current?.Kind == SyntaxKind.AmpersandToken) {
                    tokens.Add(ParseAnnotation());
                }
                else if (Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.ColonToken && Previous?.Kind == SyntaxKind.ContextualIndent2) {
                    if (fieldStarted) {
                        tokens.Add(new Token(SyntaxKind.AttributeFieldEnded));
                    }
                    fieldStarted = true;
                    tokens.Add(new Token(SyntaxKind.AttributeFieldStarted));

                    tokens.Add(TakeF()); // the identifier
                    tokens.Add(TakeF()); // the colon
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
                else if (Current?.Kind == SyntaxKind.CommentLiteral) {
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

            if (Current?.Kind == SyntaxKind.SemiColonToken) {
                tokens.Add(Take());
            }

            if (Current?.Kind == SyntaxKind.EndKeywordToken) {
                Take();
            }

            return new TokenGroup(ContextType.ViewDeclaration, tokens);
        }
    }
}
