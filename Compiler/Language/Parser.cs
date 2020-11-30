using Compiler.Symbols;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {
        public List<Token> Tokens { get; }
        public ErrorSink ErrorSink { get; }

        private int index { get; set; }
        private readonly int max;
        private Token? TokenAt(int i) {
            var pos = index + i;
            if (pos >= 0 && pos < max) return Tokens[pos];
            else return null;
        }
        private Token? Current => TokenAt(0);
        private Token? Next => TokenAt(1);
        private Token? Previous => TokenAt(-1);

        public ContextType? CurrentContext { get; private set; }

        private Token Take() {
            var c = Current;
            index++;
            return c;
        }
        private Token Take(SyntaxKind kind, string? message = null) {
            var c = Current;

            if (c is null) {
                ErrorSink.AddError(new Error(
                    message ?? $"Expected '{kind}' but reached the end of the token stream."
                ));
            }
            else if (c?.Kind != kind) {
                ErrorSink.AddError(new Error(
                    message ?? $"Expected '{kind}' but received '{Current?.Kind}'",
                    c ?? Token.DefaultSourceSegment()
                ));
                index++;
            }
            else {
                index++;
            }
            return c;
        }
        private IEnumerable<Token> TakeWhile(SyntaxKind kind) {
            while (Current != null && Current?.Kind == kind) yield return Take();
        }
        private IEnumerable<Token> TakeWhile(Predicate<Token> predicate) {
            while (Current != null && predicate(Current)) yield return Take();
        }
        private IEnumerable<Token> TakeBefore(SyntaxKind kind) {
            var i = -1;
            Token? t;
            while((t = TokenAt(i))?.Kind == kind) {
                yield return t;
                i--;
            }
        }
        private IEnumerable<Token> TakeBefore(Predicate<Token> when) {
            var i = -1;
            var token = TokenAt(i);
            while ((token = TokenAt(i)) != null && (token.Kind == SyntaxKind.NewLineToken || token.Kind == SyntaxKind.IndentToken || when(token))) {
                if (token.Kind != SyntaxKind.IndentToken)
                    yield return token;
                i--;
            }
        }
        public Parser(IEnumerable<Token> tokens, ErrorSink errorSink) {
            this.Tokens = tokens.ToList();
            this.ErrorSink = errorSink;
            max = this.Tokens.Count;
        }
    }
}
