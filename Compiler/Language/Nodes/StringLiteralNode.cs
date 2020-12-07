using Compiler.Symbols;
using System.Diagnostics;

namespace Compiler.Language.Nodes {

    [DebuggerDisplay("String Literal: {Value}")]
    public class StringLiteralNode : ExpressionNode {
        public string Value { get; }
        public string Content { get; }
        public StringLiteralNode(string value, ISourceSegment segment) : base(segment, ExpressionKind.StringLiteralExpression) {
            this.Value = value;
            this.Content = value.Trim().Substring(1, value.Length - 2);
        }

    }
}
