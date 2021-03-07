using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class ContextualParser {
        private List<TokenGroup> TokenBlocks { get; }
        private ErrorSink ErrorSink { get; }

        public ContextualParser(IEnumerable<TokenGroup> tokens, ErrorSink errorSink) {
            this.TokenBlocks = tokens.ToList();
            this.ErrorSink = errorSink;
        }

        public IEnumerable<AstNode> Parse() {

            foreach (var tokenBlock in TokenBlocks) {
                if (tokenBlock.Context == ContextType.TypeDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseTypeDefinition();
                }
                else if (tokenBlock.Context == ContextType.RecordDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseRecordDefinition();
                }
                else if (tokenBlock.Context == ContextType.DataDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseDataDefinition();
                }
                else if (tokenBlock.Context == ContextType.ChoiceDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseChoiceDefinition();
                }
                else if (tokenBlock.Context == ContextType.OpenDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseOpenDefinition();
                }
                else if (tokenBlock.Context == ContextType.MarkupDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseMarkup();
                }
                else if (tokenBlock.Context == ContextType.DirectiveDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseDirective();
                }

                // architecture
                else if (tokenBlock.Context == ContextType.PersonDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParsePerson();
                }
                else if (tokenBlock.Context == ContextType.SystemDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseSystem();
                }
                else if (tokenBlock.Context == ContextType.ComponentDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseComponent();
                } 
                else if (tokenBlock.Context == ContextType.EndPointDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseEndPoint();
                }
                else if (tokenBlock.Context == ContextType.InteractionDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseInteraction();
                }

                // documentation
                else if (tokenBlock.Context == ContextType.ViewDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseView();
                }
                else if (tokenBlock.Context == ContextType.GuidelineDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseGuideline();
                }

                // markdown
                else if (tokenBlock.Context == ContextType.MarkdownChapterDeclaration) {
                    var sourceSection = Token.Range(tokenBlock.Tokens.First(), tokenBlock.Tokens.Last());
                    yield return new MarkdownChapterNode(sourceSection, tokenBlock.Text);
                }
                else if (tokenBlock.Context == ContextType.MarkdownDeclaration) {
                    var sourceSection = Token.Range(tokenBlock.Tokens.First(), tokenBlock.Tokens.Last());
                    yield return new MarkdownNode(tokenBlock.Text, sourceSection);
                }
            }

        }
    }
}
