using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class ExpressionNode : AstNode {

        public ExpressionKind ExpressionKind { get; }

        public ExpressionNode(ISourceSegment sourceSegment, ExpressionKind expressionKind): base(sourceSegment) {
            this.ExpressionKind = expressionKind;
        }


        public ExpressionNode(ISourceSegment startSegment, ISourceSegment endSegment, ExpressionKind expressionKind) : base(startSegment, endSegment) {
            this.ExpressionKind = expressionKind;
        }

    }

    public enum ExpressionKind {
        StringLiteralExpression,
        NumberLiteralExpression,
        IdentifierExpression,
        ParameterExpression,
        FunctionDefinitionExpression,
        TypeApplicationExpression,
        GenericParameterExpression,
        MarkupExpression,
        DirectiveExpression,

        StartExpressionGroup,

        UnaryOperationExpression,
        BinaryOperationExpression,

        AliasExpression,
        TypeExpression,
        None,
        EndExpressionGroup,
        AnnotationExpression,
        RestrictionExpression,
        RecordExpressionField,
        RecordExpression,
        DataExpression,
        ChoiceExpression,
        ChoiceFieldExpression,

        ViewExpression,
        ViewItemExpression,
        GuidelineExpression,

        OpenExpression,
        IncludeExpression,
        ComponentExpression,
        InteractionExpression,
        SystemExpression,
        PersonExpression,
        EndPointExpression,
        EmptyExpression,

        RoadmapExpression, 
        MilestoneExpression,
        TaskExpression,

        FlowExpression
    }
}
