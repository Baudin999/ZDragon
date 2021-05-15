using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class IncludeNode : ExpressionNode, IIdentifierExpressionNode, IDocumentNode {
        public AnnotationNode Annotation { get; }
        public string Description => Annotation.Annotation;
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public List<Token> AllTokens { get; }
        public string QualifiedName { get; }

        public string? InterpolatedContent { get; set; } = null;
        public string Content => this.ToString();

        public string Literal => "";

        public bool IsTemplate => false;

        public IncludeNode(AnnotationNode annotationNode, Token id, Token fullBlock) : base(fullBlock, ExpressionKind.IncludeExpression) {
            this.Annotation = annotationNode;

            if (id is QualifiedToken qt) {
                Namespace = qt.Namespace;
                IdToken = qt.IdToken;
                AllTokens = qt.Parts;
                QualifiedName = qt.QualifiedName;
            }
            else {
                IdToken = id;
                Namespace = id.Value;
                AllTokens = new List<Token> { id };
                QualifiedName = id.Value;
            }
        }

        public override string ToString() {
            return $"include {QualifiedName};";
        }

    }
}
