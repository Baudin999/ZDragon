using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class ExpressionNode : AstNode {

        public ExpressionKind ExpressionKind { get; }

        public ExpressionNode(ISourceSegment sourceSegment, ExpressionKind expressionKind): base(sourceSegment) {
            this.ExpressionKind = expressionKind;
        }
    }

    public enum ExpressionKind {
        StringLiteralExpression,
        NumberLiteralExpression,
        IdentifierExpression,
        ParameterExpression,
        FunctionDefinitionExpression,

        StartExpressionGroup,

        UnaryOperationExpression,
        BinaryOperationExpression,

        AliasExpression,
        TypeExpression,
        None,
        EndExpressionGroup,
    }
}
