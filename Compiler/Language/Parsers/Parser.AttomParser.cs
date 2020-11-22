using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        private ExpressionNode ParseAtom() {
            if (Current is null) {
                throw new System.Exception("Can't parse a null token");
            }
            else if (Current.Kind == SyntaxKind.IdentifierToken && (Next?.Kind == SyntaxKind.IdentifierToken || Next?.Kind == SyntaxKind.GenericParameterToken)) {
                var typeApplicationParameters = TakeWhile(t => t.Kind == SyntaxKind.IdentifierToken || t.Kind == SyntaxKind.GenericParameterToken).ToList();
                return new TypeApplicationNode(typeApplicationParameters);
            }
            else if (Current.Kind == SyntaxKind.IdentifierToken) {
                return ParseIdentifier();
            }
            else if (Current.Kind == SyntaxKind.GenericParameterToken) {
                var parameter = Take(SyntaxKind.GenericParameterToken);
                return new GenericParameterNode(parameter);
            }
            else if (Current.Kind == SyntaxKind.AmpersandToken) {
                var attributeTokens = TakeWhile(t => t.Kind != SyntaxKind.NewLineToken).ToList();
                var annotationToken = new Token(attributeTokens, SyntaxKind.AnnotationToken);
                return new AnnotationNode(annotationToken);
            }
            else if (Current?.Kind == SyntaxKind.ParanOpenToken) {
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
