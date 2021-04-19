using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class OpenNode : ExpressionNode, IIdentifierExpressionNode {
        public AnnotationNode Annotation { get; }
        public string Description => Annotation.Annotation;
        public Token IdToken { get; }
        public string Id => IdToken.Value;

        public OpenNode(AnnotationNode annotationNode, Token id) : base(id, ExpressionKind.OpenExpression) {
            this.Annotation = annotationNode;
            this.IdToken = id;

            if (id is QualifiedToken qt) Namespace = qt.QualifiedName;
            else Namespace = id.Value;
        }

    }
}
