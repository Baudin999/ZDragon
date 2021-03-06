using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class RequirementNode : AttributesNode, IDocumentNode {

        public string? InterpolatedContent { get; set; } = null;
        public RequirementNode(ISourceSegment segment, AnnotationNode annotationNode, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, annotationNode, name, extensions, attributes, ExpressionKind.GuidelineExpression) {
        }

        public string Content => "";

        public string Literal => "";
        public bool IsTemplate => false;
    }
}
