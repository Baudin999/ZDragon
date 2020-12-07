using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class ChoiceFieldNode: ExpressionNode {
        public Token ValueToken { get; }
        public string Value => ValueToken.Value;
        public AnnotationNode? AnnotationNode { get; }
        public string Description => AnnotationNode?.Annotation ?? "";

        public ChoiceFieldNode(AnnotationNode? annotation, Token value) : base(value, ExpressionKind.ChoiceFieldExpression) {
            this.AnnotationNode = annotation;
            this.ValueToken = value;
        }
    }
}
