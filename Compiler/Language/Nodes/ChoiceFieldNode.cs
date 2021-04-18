using Compiler.Symbols;
using System.Linq;

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

        public override string Hydrate() {
            if (AnnotationNode is not null) {
                var annotations = AnnotationNode.AnnotationTokens.Select(a => a.Value);
                var annotationText = annotations.PadAndJoin("    ", System.Environment.NewLine);
                return @$"{annotationText}
    | {Value}";
            }
            else {
                return $"    | {Value}";
            }
        }
    }
}
