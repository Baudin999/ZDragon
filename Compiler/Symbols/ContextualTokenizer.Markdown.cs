using System.Collections.Generic;

namespace Compiler.Symbols {


    /// <summary>
    ///
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenBlock Markdown() {
            var tokens = new List<Token>();
            while (index < max) {
                if (Current.Kind == SyntaxKind.NewLineToken && Next?.Kind == SyntaxKind.NewLineToken) {
                    tokens.Add(Take());
                    tokens.Add(Take());
                    break;
                }
                else {
                    tokens.Add(Take());
                }
            }
            
            return new TokenBlock(ContextType.TypeDeclaration, tokens);
        }
    }
}
