using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser
    {
        public ExpressionNode ParseDirective()
        {
            var openDirective = Take(SyntaxKind.PercentageToken);
            TakeWhile(SyntaxKind.WhiteSpaceToken);
            var id = Take(SyntaxKind.IdentifierToken);
            TakeWhile(SyntaxKind.WhiteSpaceToken);
            Take(SyntaxKind.ColonToken);
            var value = TakeWhile(t => t.Kind != SyntaxKind.EndBlock);

            return new DirectiveNode(id, value);
        }
    }
}
