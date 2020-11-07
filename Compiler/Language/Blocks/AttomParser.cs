using Compiler.Language.Nodes;

namespace Compiler.Language {
    public partial class Parser {

        private ExpressionNode ParseAtom() {
            if (Current is null) {
                throw new System.Exception("Can't parse a null token");
            }
            else if (Current.kind == SyntaxKind.IdentifierToken) {
                return ParseIdentifier();
            }
            else if (Current?.kind == SyntaxKind.ParanOpenToken) {
                Take(SyntaxKind.ParanOpenToken);
                var expression = ParseExpression();
                Take(SyntaxKind.ParanCloseToken);
                return expression;
            }
            else {
                var token = Take();
                return new ExpressionNode(token, ExpressionKind.None);
            }
        }

        private IdentifierNode ParseIdentifier() {
            var id = Take(SyntaxKind.IdentifierToken);
            return new IdentifierNode(id, id);
        }

    }
}
