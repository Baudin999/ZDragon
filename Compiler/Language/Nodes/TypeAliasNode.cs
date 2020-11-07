using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class TypeAliasNode : ExpressionNode {
        public Token Id { get; private set; }
        public IEnumerable<Token> GenericParameters { get; private set; }
        public ExpressionNode Body { get; private set; }

        public TypeAliasNode(ISourceSegment sourceSegment, Token id, IEnumerable<Token> genericParameters, ExpressionNode body): base(sourceSegment, ExpressionKind.AliasExpression) {
            this.Id = id;
            this.GenericParameters = genericParameters;
            this.Body = body;
        }

        public override string ToString() {
            return $"alias {Id.value}";
        }
    }
}
