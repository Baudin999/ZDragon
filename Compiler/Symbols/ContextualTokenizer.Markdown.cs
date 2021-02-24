using System;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {


    /// <summary>
    ///
    /// </summary>
    internal partial class ContextualTokenizer {

        private TokenGroup TokenizeMarkdown() {
            var tokens = new List<Token>();
            while (index < max && Current != null) {

                if (Current?.Kind == SyntaxKind.NewLineToken && Next != null &&  (
                      Next?.Kind == SyntaxKind.NewLineToken ||
                      Mappings.Keywords.Keys.Contains(Next?.Value))
                    ) {

                    // take the new-lines
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


        private TokenGroup TokenizeChapter() {
            var tokens = new List<Token?>();
            while (Current?.Kind != SyntaxKind.NewLineToken && Current != null) {
                tokens.Add(Take());
            }

            return new TokenGroup(ContextType.MarkdownChapterDeclaration, tokens);
        }
    }
}
