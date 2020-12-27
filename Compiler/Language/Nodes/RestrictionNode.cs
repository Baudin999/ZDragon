using Compiler.Symbols;
using System.Diagnostics;

namespace Compiler.Language.Nodes {

    [DebuggerDisplay("& {Key} {Value}")]
    public class RestrictionNode : ExpressionNode {
        public Token KeyToken { get; }
        public Token ValueToken { get; }
        public string Key => KeyToken.Value;
        public string Value => ValueToken.Value;

        public RestrictionNode(Token key, Token value) : base(Token.Range(key, value), ExpressionKind.RestrictionExpression) {
            this.KeyToken = key;
            this.ValueToken = value;
        }

        internal RestrictionNode Clone() {
            return new RestrictionNode(KeyToken.Clone(), ValueToken.Clone());
        }

    }
}
