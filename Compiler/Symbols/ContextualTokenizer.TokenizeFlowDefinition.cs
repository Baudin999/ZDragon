using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Symbols {


    
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeFlowDefinition(List<Token> annotations) {
            var inField = false;
            var tokens = new List<Token>();
            tokens.AddRange(annotations);
            while (index < max && Current?.Kind != SyntaxKind.SemiColonToken) {
                if (Current?.Kind == SyntaxKind.MinusToken && Next?.Kind == SyntaxKind.GreaterThenToken) {
                    tokens.Add(new Token(new List<Token> { TakeF(), TakeF() }, SyntaxKind.NextParameterToken, 1));
                }
                else if (Current?.Kind == SyntaxKind.SingleQuoteToken && Next?.Kind == SyntaxKind.IdentifierToken) {
                    tokens.Add(new Token(new List<Token> { TakeF(), TakeF() }, SyntaxKind.GenericParameterToken, 1));
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken && (Next?.Kind != SyntaxKind.IndentToken || Next == null)) {
                    Take(); // take the newline token
                    // end the context
                    break;
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
                else if (Current?.Kind == SyntaxKind.ContextualIndent1) {
                    if (inField) tokens.Add(new Token(SyntaxKind.EndBlock));
                    _ = TakeF(SyntaxKind.ContextualIndent1);
                    tokens.Add(new Token(SyntaxKind.StartBlock));
                    inField = true;
                }
                else if (Current?.Kind == SyntaxKind.SemiColonToken) {
                    _ = TakeF(SyntaxKind.SemiColonToken);
                    if (inField) tokens.Add(new Token(SyntaxKind.EndBlock));
                    inField = false;
                }

                else {
                    tokens.Add(TakeF());
                }
            }

            if (inField) {
                tokens.Add(new Token(SyntaxKind.EndBlock));
            }

            return new TokenGroup(ContextType.FlowDeclaration, tokens);
        }
    }
}
