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
        private Token Take() {
            var c = Current;
            index++;
            return c;
        }
        private Token Take(SyntaxKind kind) {
            var c = Current;
            if (c.kind != kind) {
                ErrorSink.AddError(new Error(
                    $"Expected '{kind}' but received '{Current?.kind}'",
                    Current
                ));
                index++;
            }
            else {
                index++;
            }
            return c;
        }

        private IEnumerable<Token> TakeWhile(SyntaxKind kind) {
            while (Current != null && Current?.kind == kind) yield return Take();
        }
        private IEnumerable<Token> TakeWhile(Predicate<Token> predicate) {
            while (Current != null && predicate(Current)) yield return Take();
        }
        private IEnumerable<Token> TakeBefore(SyntaxKind kind) {
            var i = -1;
            Token? t;
            while((t = TokenAt(i))?.kind == kind) {
                yield return t;
                i--;
            }
        }

        public Parser(IEnumerable<Token> tokens, ErrorSink errorSink) {
            this.Tokens = tokens.ToList();
            this.ErrorSink = errorSink;
            max = this.Tokens.Count;
        }

        public IEnumerable<AstNode> Parse() {

            while (index < max) {
                if (Current?.kind == SyntaxKind.MarkdownStartBlockToken) {
                    yield return ParseMarkdown();
                }
                else if (Current?.kind == SyntaxKind.TypeDeclarationToken) {
                    yield return ParseTypeDefinition();
                }
                else {
                    yield return ParseExpression();
                }
            }

        }
    }
}
