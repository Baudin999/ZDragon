using Compiler.Language.Nodes;
using Compiler.Symbols;
using System;
using System.Collections.Generic;
using System.Text;

namespace Compiler.Language {
    public partial class Parser {

        public StringLiteralNode ParseStringLiteral() {
            var parts = new List<string>();
            var start = Take(SyntaxKind.StringWrapToken); // take the start token
            while (Current.Kind != SyntaxKind.StringWrapToken) {
                parts.Add(Take().Value);
            }
            var end = Take(SyntaxKind.StringWrapToken); // take the end token
            return new StringLiteralNode(string.Join("", parts), Token.Range(start, end));
        }
    }
}
