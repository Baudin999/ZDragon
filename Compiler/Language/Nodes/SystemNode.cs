using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class SystemNode : AttributesNode, IArchitectureNode {

        
        public SystemNode(ISourceSegment segment, AnnotationNode annotationNode, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, annotationNode, name, extensions, attributes, ExpressionKind.ComponentExpression) {
        }
    }
}
