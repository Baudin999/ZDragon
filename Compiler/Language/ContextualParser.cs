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
                else if (tokenBlock.Context == ContextType.MarkupDeclaration) {
                    yield return new Parser(tokenBlock.Tokens, ErrorSink).ParseMarkup();
                }
                else if (tokenBlock.Context == ContextType.MarkdownDeclaration) {
                    var sourceSection = Token.Range(tokenBlock.Tokens.First(), tokenBlock.Tokens.Last());
                    yield return new MarkdownNode(tokenBlock.Text, sourceSection);
                }
            }

        }
    }
}
