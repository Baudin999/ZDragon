using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {


    /// <summary>
    ///  
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeRecordDefinition(List<Token> annotations) {
            var tokens = new List<Token?>();
            tokens.AddRange(annotations);
            while (index < max && Current != null && Current?.Kind != SyntaxKind.EndKeywordToken) {
                if (Current?.Kind == SyntaxKind.SingleQuoteToken && Next?.Kind == SyntaxKind.IdentifierToken) {
                    tokens.Add(new Token(new List<Token?> { Take(), Take() }, SyntaxKind.GenericParameterToken, 1));
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
                else if (Current?.Kind == SyntaxKind.PercentageToken && Previous?.Kind == SyntaxKind.ContextualIndent1) {
                    // manage directive
                    var directiveTokens = TakeWhile(t => t.Kind != SyntaxKind.ContextualIndent1).ToList();
                    tokens.AddRange(directiveTokens);
                    tokens.Add(new Token(SyntaxKind.EndDirective));
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

            if (Current?.Kind == SyntaxKind.SemiColonToken) {
                tokens.Add(Take());
            }

            if (Current?.Kind == SyntaxKind.EndKeywordToken) {
                Take();
            }

            return new TokenGroup(ContextType.RecordDeclaration, tokens);
        }


        private TokenGroup TokenizeViewDefinition(List<Token> annotations) {
            var tokens = new List<Token?>();
            tokens.AddRange(annotations);
            while (index < max && Current != null && Current?.Kind != SyntaxKind.EndKeywordToken) {
                if (Current?.Kind == SyntaxKind.SingleQuoteToken && Next?.Kind == SyntaxKind.IdentifierToken) {
                    tokens.Add(new Token(new List<Token?> { Take(), Take() }, SyntaxKind.GenericParameterToken, 1));
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
