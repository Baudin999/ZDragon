using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class GenericParameterNode : ExpressionNode {

        public Token Id { get; }

        public GenericParameterNode(Token genericParameter): base(genericParameter, ExpressionKind.GenericParameterExpression) {
            this.Id = genericParameter;
        }
    }
}
