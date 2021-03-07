using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class GuidelineNode : AttributesNode, IDocumentNode {

        
        public GuidelineNode(ISourceSegment segment, Token name, IEnumerable<AttributeNode> attributes) : base(segment, name, attributes, ExpressionKind.GuidelineExpression) {
        }

        public string Content => "";

        public string Literal => "";
    }
}
