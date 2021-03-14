using System;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {


    /// <summary>
    ///
    /// </summary>
    internal partial class ContextualTokenizer {

        private TokenGroup TokenizeMarkdown() {
            var tokens = new List<Token?>();
            while (index < max && Current?.Kind != SyntaxKind.StartBlock) {

                // we'll want to put chapters into a different block becuase 
                // we'll want to create a table of contents.
                if (Current?.Kind == SyntaxKind.NewLineToken && Next?.Kind == SyntaxKind.HashToken) {
                    break;
                }
                tokens.Add(Take());
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
