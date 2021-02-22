using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class InteractionNode : AttributesNode, IArchitectureNode {

        
        public InteractionNode(ISourceSegment segment, Token name, IEnumerable<AttributeNode> attributes) : base(segment, name, attributes, ExpressionKind.ComponentExpression) {
        }
    }
}
