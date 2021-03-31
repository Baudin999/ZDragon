using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class DirectiveNode : ExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value.Trim().ToLower();
        public IEnumerable<Token> ValueTokens { get; }

        public string Key => this.Id;
        public string Value => this.Literal;

        public string Literal { get; }

        public DirectiveNode(Token id, IEnumerable<Token> value) : base(id, ExpressionKind.DirectiveExpression) {
            this.IdToken = id;
            this.ValueTokens = value.ToList();
            this.Literal = string.Join("", ValueTokens.Select(value => value.Value)).Replace(";", "").Trim();
        }


        public DirectiveNode Clone() {
            return new DirectiveNode(
                this.IdToken.Clone(),
                this.ValueTokens.Select(vt => vt.Clone())
                );
        }
    }
}
