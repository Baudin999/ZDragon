using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class GenericParameterNode : ExpressionNode {

        public Token IdToken { get; }
        public string Id => IdToken.Value;

        public GenericParameterNode(Token genericParameter): base(genericParameter, ExpressionKind.GenericParameterExpression) {
            this.IdToken = genericParameter;
        }
    }
}
