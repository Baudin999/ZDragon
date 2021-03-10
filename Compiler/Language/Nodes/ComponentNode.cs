using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class ComponentNode : AttributesNode, IArchitectureNode {

        public ComponentNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, name, extensions, attributes, ExpressionKind.ComponentExpression) {
            
        }

    }
}
