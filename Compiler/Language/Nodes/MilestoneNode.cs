using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class MilestoneNode : AttributesNode, IPlanningNode {
        public MilestoneNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes) : base(segment, name, extensions, attributes, ExpressionKind.MilestoneExpression) {

        }
    }

}
