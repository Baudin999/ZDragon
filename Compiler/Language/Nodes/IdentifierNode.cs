using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class IdentifierNode : ExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value;

        public IdentifierNode(ISourceSegment sourceSegment, Token id): base(sourceSegment, ExpressionKind.IdentifierExpression) {
            this.IdToken = id;
        }

        public override string ToString() {
            return Id;
        }
    }
}
