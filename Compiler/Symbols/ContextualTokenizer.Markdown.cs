using System.Collections.Generic;

namespace Compiler.Symbols {


    /// <summary>
    ///
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeMarkdown() {
            var tokens = new List<Token>();
            while (index < max && Current != null) {
                if (Current.Kind == SyntaxKind.NewLineToken && Next?.Kind == SyntaxKind.NewLineToken) {
                    tokens.Add(Take());
                    tokens.Add(Take());
                    break;
                }
                else {
                    tokens.Add(Take());
                }
            }
            
            return new TokenGroup(ContextType.MarkdownDeclaration, tokens);
        }
    }
}
