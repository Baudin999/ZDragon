using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class RequirementNode : AttributesNode, IDocumentNode {

        
        public RequirementNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, name, extensions, attributes, ExpressionKind.GuidelineExpression) {
        }

        public string Content => "";

        public string Literal => "";
    }
}
