using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class EndpointNode : AttributesNode, IArchitectureNode, IDocumentNode {
        public ExpressionNode? TypeDefinition { get; }

        public string Content => "";

        public string Literal => "";
        public bool IsTemplate => false;

        public EndpointNode(
            ISourceSegment segment, AnnotationNode annotationNode, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes, ExpressionNode? typeDefinition) : 
            base(segment, annotationNode, name, extensions, attributes, ExpressionKind.EndPointExpression) {
            //
            this.TypeDefinition = typeDefinition;
        }

    }
}
