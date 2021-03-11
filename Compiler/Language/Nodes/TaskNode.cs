using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {

    public interface IPlanningNode { }

    public class TaskNode : AttributesNode, IPlanningNode {
        public TaskNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, name, extensions, attributes, ExpressionKind.ComponentExpression) {
            
        }
    }

    public class RoadmapNode : AttributesNode, IPlanningNode {
        public RoadmapNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, name, extensions, attributes, ExpressionKind.ComponentExpression) {

        }
    }

    public class MilestoneNode : AttributesNode, IPlanningNode {
        public MilestoneNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, name, extensions, attributes, ExpressionKind.ComponentExpression) {

        }
    }

}
