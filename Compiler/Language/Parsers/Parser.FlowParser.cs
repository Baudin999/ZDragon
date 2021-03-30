using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Language {
    public partial class Parser {
        public FlowNode? ParseFlow() {
            var openDirective = Take(SyntaxKind.FlowDeclarationToken);
            var id = TakeF(SyntaxKind.IdentifierToken);
            _ = TakeF(SyntaxKind.EqualsToken);

            var steps = new List<ExpressionNode>();
            while (Current != null && Current.Kind == SyntaxKind.StartBlock) {
                _ = TakeF(SyntaxKind.StartBlock);
                steps.Add(ParseExpression());
                _ = TakeF(SyntaxKind.EndBlock);
            }

            return new FlowNode(id, steps, id, ExpressionKind.FlowExpression);
        }
    }
}
