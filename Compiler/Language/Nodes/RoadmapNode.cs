using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class RoadmapNode : AttributesNode, IPlanningNode {
        public RoadmapNode(ISourceSegment segment, AnnotationNode annotationNode, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, annotationNode, name, extensions, attributes, ExpressionKind.RoadmapExpression) {

        }
    }

}
