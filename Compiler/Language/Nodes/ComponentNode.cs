using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {

    public abstract class BaseAttributesNode: AttributesNode {
        public BaseAttributesNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, name, extensions, attributes, ExpressionKind.ComponentExpression) {

        }
    }

    public class ComponentNode : AttributesNode, IArchitectureNode {

        public ComponentNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, name, extensions, attributes, ExpressionKind.ComponentExpression) {
            
        }

    }
}
