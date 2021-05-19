using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class ViewNodeItem : AttributesNode {

        public ViewNodeItem(Token id) :
            base(id, null, id, new List<Token>(), new List<AttributeNode>(), ExpressionKind.ViewItemExpression) { }

        public ViewNodeItem(Token id, List<AttributeNode> attributes) :
            base(id, null, id, new List<Token>(), attributes, ExpressionKind.ViewItemExpression) {

            // nothing to implement
        }
    }
}
