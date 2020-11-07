using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class BinaryOperatorNode : ExpressionNode {
        public ExpressionNode Left { get; }
        public Token OperatorToken {get; }
        public ExpressionNode Right {get; }

        public BinaryOperatorNode(ExpressionNode left, Token operatorToken, ExpressionNode right) : base(Token.Range(left.Segment, right.Segment), ExpressionKind.BinaryOperationExpression) {
            this.Left = left;
            this.OperatorToken = operatorToken;
            this.Right = right;
        }
    }
}
