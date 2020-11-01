using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language {
    public partial class Parser {
        private AstNode ParseMarkdown() {
            var markdown = new List<string>();
            var start = Take(SyntaxKind.MarkdownStartBlockToken); // take the start token
            while (Current.kind != SyntaxKind.MarkdownEndBlockToken) {
                markdown.Add(Take().value);
            }
            var end = Take(SyntaxKind.MarkdownEndBlockToken); // take the end token
            return new MarkdownNode(string.Join("", markdown), Token.Range(start, end));
        }
    }
}
