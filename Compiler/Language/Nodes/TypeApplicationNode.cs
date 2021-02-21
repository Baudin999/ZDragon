using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class TypeApplicationNode : ExpressionNode {
        public List<Token> Parameters { get; }
        public TypeApplicationNode(IEnumerable<Token> tokens) : base(Token.Range(tokens.First(), tokens.Last()), ExpressionKind.TypeApplicationExpression) {
            //
            Parameters = tokens.ToList();
        }

        public override string ToString() {
            return "(" + string.Join(" ", Parameters) + ")";
        }
    }
}
