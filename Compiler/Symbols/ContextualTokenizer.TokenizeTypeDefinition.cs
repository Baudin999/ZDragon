using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Symbols {


    /// <summary>
    /// The type definition tokenizer, this function takes a stream of tokens and 
    /// creates a token-block specifically for type declarations like:
    /// 
    /// type name = string;
    /// type add = number -> number -> number;
    /// 
    /// The semicolon at the end of the type definition is important.
    /// Splitting the defintion over multiple lines requires an indentation:
    /// 
    /// type add =
    ///     number ->
    ///     number ->
    ///     number;
    ///     
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeTypeDefinition(List<Token> annotations) {
            var tokens = new List<Token>();
            tokens.AddRange(annotations);
            while (index < max && Current.Kind != SyntaxKind.SemiColonToken) {
                if (Current.Kind == SyntaxKind.MinusToken && Next?.Kind == SyntaxKind.GreaterThenToken) {
                    tokens.Add(new Token(new List<Token> { Take(), Take() }, SyntaxKind.NextParameterToken, 1));
                }
                else if (Current.Kind == SyntaxKind.SingleQuoteToken && Next?.Kind == SyntaxKind.IdentifierToken) {
                    tokens.Add(new Token(new List<Token> { Take(), Take() }, SyntaxKind.GenericParameterToken, 1));
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken && (Next?.Kind != SyntaxKind.IndentToken || Next == null)) {
                    Take(); // take the newline token
                    // end the context
                    break;
                }
                //else if (Current.Kind == SyntaxKind.NewLineToken && Next?.Kind != SyntaxKind.IndentToken) {
                //    ErrorSink.AddError(new Error(
                //        @"Indentation Error: Expected an Indentation after a 'New Line'.",
                //        Next ?? Current
                //    ));
                //    Take();
                //}
                else if (Current?.Kind == SyntaxKind.DoubleQuoteToken) {
                    tokens.Add(AggregateStringLiteralToken());
                }
                else if (Current.Kind == SyntaxKind.IndentToken) {
                    Take();
                }
                else if (Current.Kind == SyntaxKind.WhiteSpaceToken) {
                    Take();
                }
                else if (Current.Kind == SyntaxKind.NewLineToken) {
                    Take();
                }
                else {
                    tokens.Add(Take());
                }
            }

            if (Current?.Kind == SyntaxKind.SemiColonToken) {
                tokens.Add(Take());
            }

            return new TokenGroup(ContextType.TypeDeclaration, tokens);
        }
    }
}
