using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class SystemNode : AttributesNode {

        
        public SystemNode(ISourceSegment segment, Token name, IEnumerable<AttributeNode> attributes) : base(segment, name, attributes, ExpressionKind.SystemExpression) {
        }
    }
}
