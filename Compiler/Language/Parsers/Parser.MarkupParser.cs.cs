using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language {
    public partial class Parser {

        public AstNode ParseMarkup() {
            var start = Take(SyntaxKind.LessThenToken);
            var id = TakeF(SyntaxKind.IdentifierToken);

            return new MarkupNode(id);
        }
    }
}
