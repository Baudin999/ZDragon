using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language {
    public partial class Parser {

        public AstNode ParseMarkup() {

            var start = Take(SyntaxKind.LessThenToken);
            var id = Take(SyntaxKind.IdentifierToken);



            return null;

            //var markdown = new List<string>();
            //var start = Take(SyntaxKind.MarkdownStartBlockToken); // take the start token
            //while (Current.Kind != SyntaxKind.MarkdownEndBlockToken) {
            //    markdown.Add(Take().Value);
            //}
            //var end = Take(SyntaxKind.MarkdownEndBlockToken); // take the end token
            //return new MarkdownNode(string.Join("", markdown), Token.Range(start, end));
        }
    }
}
