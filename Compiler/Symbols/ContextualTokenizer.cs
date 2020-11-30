using System;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {
    internal partial class ContextualTokenizer {
        public List<Token> Tokens { get; }
        public ErrorSink ErrorSink { get; }

#pragma warning disable IDE0044 // Add readonly modifier
        private int indentLevel = 0;
        private ContextType CurrentContext = ContextType.None;
#pragma warning restore IDE0044 // Add readonly modifier

        private int index = 0;
        private readonly int max;
        private Token? Current => index < max ? Tokens[index] : null;
        private Token? Next => (index + 1) < max ? Tokens[index + 1] : null;
        private Token? Take() {
            var c = Current;
            index++;
            if (c != null)
                c.Context = CurrentContext;
            return c;
        }
        private Token? Take(SyntaxKind kind) {
            if (Current?.Kind != kind) throw new Exception($"Expected token of kind '{kind}' but received token of kind'{Current.Kind}'.");
            return Take();
        }
        private IEnumerable<Token> TakeWhile(Predicate<Token> p, int indentLevel = 0) {
            while (Current != null && p(Current)) {
                yield return Take().ChangeIndentLevel(indentLevel);
            }
        }

        public ContextualTokenizer(List<Token> tokens, ErrorSink errorSink) {
            this.Tokens = tokens;
            this.ErrorSink = errorSink;
            max = this.Tokens.Count;
        }


        /// <summary>
        /// Aggregate all the parts between string wrap tokens " Something " and
        /// combine these into a string literal token. Later on we will parse the
        /// contextual segments out of the string literal.
        /// 
        /// Example: "Something"
        /// Example 2: "{a} is a word"  <-- valiable can be found within the scope
        /// </summary>
        /// <returns>Token</returns>
        private Token AggregateStringLiteralToken() {
            List<Token?> parts = new List<Token?> { Take(SyntaxKind.DoubleQuoteToken) }.Where(i => i != null).ToList();
            
            while (Current?.Kind != SyntaxKind.DoubleQuoteToken && Current != null) {
                parts.Add(Take());
            }
            parts.Add(Take(SyntaxKind.DoubleQuoteToken));

            return new Token(parts, SyntaxKind.StringLiteralToken, indentLevel);
        }

        private Token ParseAnnotation() {
            var attributeTokens = TakeWhile(t => t.Kind != SyntaxKind.NewLineToken).ToList();
            var annotationToken = new Token(attributeTokens, SyntaxKind.AnnotationToken);
            return annotationToken;
        }

        internal IEnumerable<TokenGroup> Tokenize(ContextType contextType = ContextType.None) {
            List<Token> annotations = new List<Token>();
            while (index < max) {
                if (Current?.Kind == SyntaxKind.TypeDeclarationToken) {
                    yield return TokenizeTypeDefinition(annotations);
                    annotations = new List<Token>();
                }
                else if (Current?.Kind == SyntaxKind.RecordDeclarationToken) {
                    yield return TokenizeRecordDefinition(annotations);
                    annotations = new List<Token>();
                }
                else if (Current?.Kind == SyntaxKind.DataDeclarationToken) {
                    yield return TokenizeDataDefinition(annotations);
                    annotations = new List<Token>();
                }
                else if (Current?.Kind == SyntaxKind.LessThenToken) {
                    // we'll have to start parsing markup
                    yield return TokenizeMarkupDefinition();
                    annotations = new List<Token>();
                }
                else if (Current?.Kind == SyntaxKind.AmpersandToken) {
                    annotations.Add(ParseAnnotation());
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken) {
                    Take();
                }
                else {
                    // We are probably in a markdown block and will interpert it like so...
                    yield return TokenizeMarkdown();
                }
            }
        }
    }

    public enum ContextType {
        None,
        LanguageDeclaration,
        TypeDeclaration,
        RecordDeclaration,
        DataDeclaration,
        FunctionDeclaration,
        MarkdownDeclaration,
        VariableDef,
        MarkupDeclaration
    }
}
