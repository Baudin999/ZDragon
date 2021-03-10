using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class EndpointNode : AttributesNode, IArchitectureNode {
        public ExpressionNode? TypeDefinition { get; }
        public EndpointNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes, ExpressionNode? typeDefinition) : base(segment, name, extensions, attributes, ExpressionKind.EndPointExpression) {
            this.TypeDefinition = typeDefinition;
        }

    }
}
