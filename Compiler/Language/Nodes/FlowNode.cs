using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class FlowNode : ExpressionNode, IIdentifierExpressionNode {

        public Token IdToken { get; }

        public string Id => IdToken.Value;

        public List<ExpressionNode> Steps { get; }

        public FlowNode(Token idToken, IEnumerable<ExpressionNode> steps, ISourceSegment sourceSegment, ExpressionKind expressionKind) : base(sourceSegment, expressionKind) {
            this.IdToken = idToken;
            this.Steps = steps.ToList();
        }
    }
}
