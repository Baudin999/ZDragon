using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class IdentifierNode : ExpressionNode {
        public Token Id { get; }

        public IdentifierNode(ISourceSegment sourceSegment, Token id): base(sourceSegment, ExpressionKind.IdentifierExpression) {
            this.Id = id;
        }
    }
}
