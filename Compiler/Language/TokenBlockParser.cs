using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class TokenBlockParser {
        private List<TokenBlock> TokenBlocks { get; }
        private ErrorSink ErrorSink { get; }

        public TokenBlockParser(IEnumerable<TokenBlock> tokens, ErrorSink errorSink) {
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
            }

        }
    }
}
