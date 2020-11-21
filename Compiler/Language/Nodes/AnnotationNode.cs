using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class AnnotationNode : ExpressionNode {
        public string Annotation { get; private set; }

        public AnnotationNode(Token annotation) : base(annotation, ExpressionKind.AnnotationExpression) {
            this.Annotation = annotation.Value;
        }

        public AnnotationNode Add(Token annotation) {
            this.Annotation += " " + annotation.Value;
            this.Segment = Token.Range(this.Segment, annotation);
            return this;
        }
    }
}
