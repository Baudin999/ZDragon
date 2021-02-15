using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public partial class AnnotationNode : ExpressionNode {
        public Token Token { get; private set; }
        public string Annotation { get; private set; }

        public AnnotationNode(Token annotation) : base(annotation, ExpressionKind.AnnotationExpression) {
            this.Token = annotation;
            this.Annotation = annotation.Value.Replace("@", "").Trim();
        }

        public AnnotationNode(IEnumerable<Token> annotations) : base(annotations.First(), annotations.Last(), ExpressionKind.AnnotationExpression) {
            this.Token = new Token(annotations.ToList(), SyntaxKind.AnnotationToken, 0);
            this.Annotation = annotations
                .Aggregate<Token, string>("", (acc, t) => acc += (" " + t.Value.Replace("@", "").Trim())).Trim();
        }

        public AnnotationNode(ISourceSegment? start) : base(start ?? SourceSegment.Empty, ExpressionKind.AnnotationExpression) {
            this.Token = new Token();
            this.Annotation = "";
        }

        public AnnotationNode Add(Token annotation) {
            this.Token = this.Token.Combine(annotation);
            this.Annotation += " " + annotation.Value.Replace("@", "").Trim();
            this.Segment = Token.Range(this.Segment, annotation);
            return this;
        }

      

        internal AnnotationNode Clone() {
            return new AnnotationNode(this.Token);
        }
    }
}
