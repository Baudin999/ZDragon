using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class PersonNode : AttributesNode, IArchitectureNode {

        public PersonNode(ISourceSegment segment, AnnotationNode annotationNode, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, annotationNode, name, extensions, attributes, ExpressionKind.PersonExpression) {
        }
    }

}
