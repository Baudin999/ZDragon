using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class EndpointNode : AttributesNode, IArchitectureNode {
        public ExpressionNode? TypeDefinition { get; }
        public EndpointNode(ISourceSegment segment, Token name, IEnumerable<AttributeNode> attributes, ExpressionNode? typeDefinition) : base(segment, name, attributes, ExpressionKind.EndPointExpression) {
            this.TypeDefinition = typeDefinition;
        }

    }
}
