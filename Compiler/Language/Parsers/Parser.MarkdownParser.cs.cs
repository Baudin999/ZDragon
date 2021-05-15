using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language {
    public partial class Parser {
        private AstNode ParseMarkdown() {
            var markdown = new List<string>();
            var start = TakeF(SyntaxKind.MarkdownStartBlockToken); // take the start token
            while (Current?.Kind != SyntaxKind.MarkdownEndBlockToken) {
                markdown.Add(TakeF().Value);
            }
            var end = TakeF(SyntaxKind.MarkdownEndBlockToken); // take the end token
            return new MarkdownNode(string.Join("", markdown), Token.Range(start, end));
        }
    }
}
