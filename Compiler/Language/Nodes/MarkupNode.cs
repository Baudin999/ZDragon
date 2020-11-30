using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class MarkupNode : ExpressionNode {
        public MarkupNode(ISourceSegment sourceSegment) : base(sourceSegment, ExpressionKind.MarkupExpression) {
            //
        }
    }
}
