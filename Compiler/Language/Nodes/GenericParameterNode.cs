using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class ParameterNode: ExpressionNode {

        public Token Id { get; }

        public ParameterNode(ISourceSegment sourceSegment, Token id) : base(sourceSegment, ExpressionKind.IdentifierExpression) {
            this.Id = id;
        }

        public ParameterNode(IdentifierNode idNode): base(idNode.Segment, ExpressionKind.ParameterExpression) {
            this.Id = idNode.Id;
        }
    }
}
