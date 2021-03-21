using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class EndpointNode : AttributesNode, IArchitectureNode, IDocumentNode {
        public ExpressionNode? TypeDefinition { get; }

        public string Content => "";

        public string Literal => "";
        public bool IsTemplate => false;

        public EndpointNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes, ExpressionNode? typeDefinition) : base(segment, name, extensions, attributes, ExpressionKind.EndPointExpression) {
            this.TypeDefinition = typeDefinition;
        }

    }
}
