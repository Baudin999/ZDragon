using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class ChoiceNode : ExpressionNode {
        public AnnotationNode Annotation { get; }
        public string Description => Annotation.Annotation;
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public List<ChoiceFieldNode> Fields { get; }

        public ChoiceNode(AnnotationNode annotationNode, Token id, List<ChoiceFieldNode> fields) : base(id, ExpressionKind.ChoiceExpression) {
            this.Annotation = annotationNode;
            this.IdToken = id;
            this.Fields = fields;
        }

    }
}
