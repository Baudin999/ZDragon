using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class GuidelineNode : AttributesNode, IDocumentNode {

        
        public GuidelineNode(ISourceSegment segment, AnnotationNode annotationNode, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, annotationNode, name, extensions, attributes, ExpressionKind.GuidelineExpression) {
        }

        public string? InterpolatedContent { get; set; } = null;
        public string Content => "";

        public string Literal => "";
        public bool IsTemplate => false;
    }
}
