using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeAttributesDefinition(List<Token> annotations, ContextType contextType) {
            var tokens = new List<Token?>();
            var definitionEnded = false;
            var fieldStarted = false;

            while (Current != null && Current?.Kind != SyntaxKind.EndBlock) {

                // We'll want to end the definition phase of the token-grouper
                if (Current?.Kind == SyntaxKind.EqualsToken) {
                    tokens.Add(Take()); // take the equals
                    definitionEnded = true;
                }


                // in the definition of an endpoint we can write things like ":: PersonId -> Person"
                // the arrow in this context is a NextParameterToken.
                else if (!definitionEnded && Current?.Kind == SyntaxKind.MinusToken && Next?.Kind == SyntaxKind.GreaterThenToken) {
                    tokens.Add(new Token(new List<Token> { TakeF(), TakeF() }, SyntaxKind.NextParameterToken, 1));
                }

                // Fully qualified types.
                else if (!fieldStarted && Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.DotToken) {
                    var identifierParts = new List<Token>();
                    while (Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.DotToken) {
                        identifierParts.Add(TakeF(SyntaxKind.IdentifierToken)); // add the part
                        Take(); // skip the dot
                    }
                    identifierParts.Add(TakeF(SyntaxKind.IdentifierToken));

                    tokens.Add(new QualifiedToken(identifierParts));
                }


                // This shows us that a field definition has started
                // [....]Name: Something
                // ContextualIndent1 IdentifierToken ColonToken
                else if (Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.ColonToken && Previous?.Kind == SyntaxKind.ContextualIndent1) {
                    if (fieldStarted) {
                        tokens.Add(new Token(SyntaxKind.AttributeFieldEnded));
                    }
                    fieldStarted = true;
                    tokens.Add(new Token(SyntaxKind.AttributeFieldStarted));

                    tokens.Add(Take()); // the identifier
                    tokens.Add(Take()); // the colon
                }

                else if (!fieldStarted && Current?.Kind == SyntaxKind.WhiteSpaceToken) Take();              // skip whitespaces, but only outside of field definitions
                else if (!fieldStarted && Current?.Kind == SyntaxKind.NewLineToken) Take();                 // skip newlines outside of field definition
                else if (
                    fieldStarted &&
                    Current?.Kind == SyntaxKind.NewLineToken &&
                    Next?.Kind == SyntaxKind.ContextualIndent1) Take();                                     // Skip the newlines at the end of the description field before a new field
                else if (
                    fieldStarted &&
                    Current?.Kind == SyntaxKind.NewLineToken &&
                    Next?.Kind != SyntaxKind.ContextualIndent1) tokens.Add(Take());                         // include newlines in description fields.
                else if (Current?.Kind == SyntaxKind.ContextualIndent1) Take();                             // contextual tokens...
                else if (Current?.Kind == SyntaxKind.ContextualIndent2) {
                    tokens.Add(new Token(System.Environment.NewLine, SyntaxKind.NewLineToken, Current));
                    Take();
                }
                else if (fieldStarted && Current?.Kind == SyntaxKind.ContextualIndent3) {
                    tokens.Add(new Token(System.Environment.NewLine + "    ", SyntaxKind.NewLineToken, Current));
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.ContextualIndent4) {
                    tokens.Add(new Token(System.Environment.NewLine + "        ", SyntaxKind.NewLineToken, Current));
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.ContextualIndent5) {
                    tokens.Add(new Token(System.Environment.NewLine + "            ", SyntaxKind.NewLineToken, Current));
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

            return new TokenGroup(contextType, tokens);
        }
    }
}


/*
    if (Current?.Kind == SyntaxKind.NewLineToken) {
        Take();
        tokens.Add(new Token(" ", SyntaxKind.WhiteSpaceToken, Token.DefaultSourceSegment()));
    }
    else if (!fieldStarted && Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.DotToken) {
        var identifierParts = new List<Token>();
        while (Current?.Kind == SyntaxKind.IdentifierToken && Next?.Kind == SyntaxKind.DotToken) {
            identifierParts.Add(TakeF(SyntaxKind.IdentifierToken)); // add the part
            Take(); // skip the dot
        }
        identifierParts.Add(TakeF(SyntaxKind.IdentifierToken));

        tokens.Add(new QualifiedToken(identifierParts));
    }
    else if (Current?.Kind == SyntaxKind.MinusToken && Next?.Kind == SyntaxKind.GreaterThenToken) {
        tokens.Add(new Token(new List<Token> { TakeF(), TakeF() }, SyntaxKind.NextParameterToken, 1));
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
 */