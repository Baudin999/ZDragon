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
        private Token TakeF(SyntaxKind kind) {
            var result = Take();
            if (result is null) throw new Exception($"Expected token of kind '{kind}' but received token of kind'{Current.Kind}'.");
            else return result;
        }
        private IEnumerable<Token> TakeWhile(Predicate<Token> p, int indentLevel = 0) {
            while (Current != null && p(Current)) {
                yield return Take().ChangeIndentLevel(indentLevel);
            }
        }

        private bool IsEndBlock(int depth = 0) {
            if (Current == null) return true;
            if (depth == 0) {
                return Current?.Kind == SyntaxKind.NewLineToken && (Next == null || Next?.Kind != SyntaxKind.IndentToken);
            }
            else if (depth > 0) {
                if (Current?.Kind != SyntaxKind.NewLineToken) return false;

                // the newline compensator
                var nl = 1;
                while (Next?.Kind == SyntaxKind.NewLineToken) nl++;


                if (index + (depth + nl) > max) return false;
                var valid = Tokens[index + depth + nl].Kind != SyntaxKind.IndentToken;
                for (int i = nl; i < depth + nl; ++i) {
                    valid = Tokens[index + i].Kind == SyntaxKind.IndentToken && valid;
                }
                return valid;
            }
            else {
                return false;
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
                else if (Current?.Kind == SyntaxKind.ChoiceDeclarationToken) {
                    yield return TokenizeChoiceDefinition(annotations);
                    annotations = new List<Token>();
                }
                else if (Current?.Kind == SyntaxKind.OpenDeclarationToken) {
                    yield return TokenizeOpenDefinition(annotations);
                    annotations = new List<Token>();
                }
                else if(Current?.Kind == SyntaxKind.ViewDeclarationToken) {
                    yield return TokenizeViewDefinition(annotations);
                }
                else if (Current?.Kind == SyntaxKind.GuidelineDeclarationToken) {
                    yield return TokenizeAttributesDefinition(annotations, ContextType.GuidelineDeclaration);
                }
                else if (Current?.Kind == SyntaxKind.RequirementDeclarationToken) {
                    yield return TokenizeAttributesDefinition(annotations, ContextType.RequirementDeclaration);
                }
                else if (Current?.Kind == SyntaxKind.LessThenToken) {
                    // we'll have to start parsing markup
                    yield return TokenizeMarkupDefinition();
                    annotations = new List<Token>();
                }
                else if (Current?.Kind == SyntaxKind.PercentageToken) {
                    yield return TokenizeDirective();
                }
                else if (Current?.Kind == SyntaxKind.AmpersandToken) {
                    annotations.Add(ParseAnnotation());
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken) {
                    Take();
                }
                else if (Current?.Kind == SyntaxKind.HashToken) {
                    yield return TokenizeChapter();
                }
                else if (Current?.Kind == SyntaxKind.PersonDeclarationToken) {
                    //
                    yield return TokenizeAttributesDefinition(annotations, ContextType.PersonDeclaration);
                }
                else if (Current?.Kind == SyntaxKind.SystemDeclarationToken) {
                    //
                    yield return TokenizeAttributesDefinition(annotations, ContextType.SystemDeclaration);
                }
                else if (Current?.Kind == SyntaxKind.ComponentDeclarationToken) {
                    //
                    yield return TokenizeAttributesDefinition(annotations, ContextType.ComponentDeclaration);
                }
                else if (Current?.Kind == SyntaxKind.EndPointDeclarationToken) {
                    //
                    yield return TokenizeAttributesDefinition(annotations, ContextType.EndPointDeclaration);
                }
                else if (Current?.Kind == SyntaxKind.InteractionDeclarationToken) {
                    //
                    yield return TokenizeAttributesDefinition(annotations, ContextType.InteractionDeclaration);
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
        OpenDeclaration,
        TypeDeclaration,
        RecordDeclaration,
        DataDeclaration,
        ChoiceDeclaration,
        FunctionDeclaration,

        PersonDeclaration,
        SystemDeclaration,
        ComponentDeclaration,
        EndPointDeclaration,


        MarkdownDeclaration,
        MarkdownChapterDeclaration,

        DirectiveDeclaration,
        VariableDef,
        MarkupDeclaration,
        InteractionDeclaration,
        ViewDeclaration,
        GuidelineDeclaration,
        RequirementDeclaration,
    }
}
