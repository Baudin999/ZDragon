using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class ChoiceNode : ExpressionNode, ILanguageNode, IIdentifierExpressionNode {
        public AnnotationNode Annotation { get; }
        public string Description => Annotation.Annotation;
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public List<ChoiceFieldNode> Fields { get; }
        public bool Imported { get; set; } = false;
        public string? ImportedFrom { get; set; } = null;

        public ChoiceNode(AnnotationNode annotationNode, Token id, List<ChoiceFieldNode> fields) : base(id, ExpressionKind.ChoiceExpression) {
            this.Annotation = annotationNode;
            this.IdToken = id;
            this.Fields = fields;
        }

    }
}
