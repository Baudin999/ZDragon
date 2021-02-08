using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class EndPointNode : AttributesNode {
        public EndPointNode(ISourceSegment segment, Token name, IEnumerable<AttributeNode> attributes) : base(segment, name, attributes, ExpressionKind.ComponentExpression) {
        }
    }
}
