using Compiler.Language.Nodes;
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

        private Token? Take() {
            var c = Current;
            index++;
            return c;
        }
        private Token TakeF(string? message = null) {
            var c = Current;
            index++;
            if (c != null)
                return c;
            else 
                throw new Exception(message ?? "Token is null");
        }
        private Token TakeF(SyntaxKind kind, ErrorKind errorType = ErrorKind.Unknown, string? message = null) {
            var c = Current;
            index++;
            if (c != null && c.Kind == kind)
                return c;
            else {
                var v = c is null ? "null" : c.Kind.ToString();
                ErrorSink.AddError(
                    new Error(errorType, message ?? $"Expected '{kind}' but received '{v}'", Current ?? Token.DefaultSourceSegment()));
                throw new Exception(message ?? $"Expected '{kind}' but received '{v}'");
            }
        }
        private Token? Take(SyntaxKind kind, string? message = null) {
            var c = Current;

            if (c is null) {
                // DO NOTHING!
            }
            else if (c?.Kind != kind) {
                ErrorSink.AddError(new Error(
                    message ?? $"Expected '{kind}' but received '{Current?.Kind}'",
                    c ?? Token.DefaultSourceSegment()
                ));
                return null;
            }
            else {
                index++;
            }
            return c;
        }
        private Token? TryTake(SyntaxKind kind) {
            if (Current?.Kind == kind) return TakeF();
            else return null;
        }
        private IEnumerable<Token> TakeWhile(SyntaxKind kind) {
            var tokens = new List<Token>();
            while (Current != null && Current?.Kind == kind) tokens.Add(TakeF());
            return tokens;
        }
        private IEnumerable<Token> TakeWhile(Predicate<Token> predicate) {
            while (Current != null && predicate(Current)) yield return TakeF();
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
