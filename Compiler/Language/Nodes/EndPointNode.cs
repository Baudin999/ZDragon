using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class EndPointNode : AttributesNode {
        public ExpressionNode TypeDefinition { get; }
        public EndPointNode(ISourceSegment segment, Token name, IEnumerable<AttributeNode> attributes, ExpressionNode? typeDefinition) : base(segment, name, attributes, ExpressionKind.ComponentExpression) {
            this.TypeDefinition = typeDefinition;
        }

    }
}
