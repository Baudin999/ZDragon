using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class PersonNode : AttributesNode {

        
        public PersonNode(ISourceSegment segment, Token name, IEnumerable<AttributeNode> attributes) : base(segment, name, attributes, ExpressionKind.PersonExpression) {
        }
    }
}
