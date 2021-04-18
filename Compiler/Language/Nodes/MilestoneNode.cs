using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class MilestoneNode : AttributesNode, IPlanningNode {
        public MilestoneNode(ISourceSegment segment, AnnotationNode annotationNode, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, annotationNode, name, extensions, attributes, ExpressionKind.MilestoneExpression) {

        }
    }

}
