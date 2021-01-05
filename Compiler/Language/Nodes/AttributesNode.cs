using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class AttributesNode : ExpressionNode, IIdentifierExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public IEnumerable<AttributeNode> Attributes { get; }

        public AttributesNode(ISourceSegment segment, Token name, IEnumerable<AttributeNode> attributes, ExpressionKind kind) : base(segment, kind) {
            this.IdToken = name;
            this.Attributes = attributes.ToList();
        }
    }

    public class AttributeNode : AstNode {
        public Token KeyToken { get; }
        public IEnumerable<Token> ValueToken { get; }
        public string Key => KeyToken.Value;
        public string Value { get; }

        public AttributeNode(Token key, IEnumerable<Token> value) : base(Token.Range(key, value.Last())) {
            this.KeyToken = key;
            this.ValueToken = value;
            this.Value = string.Join("", value.Select(v => v.Value)).Trim();
        }
    }
}
