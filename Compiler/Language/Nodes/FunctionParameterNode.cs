using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class FunctionParameterNode : ExpressionNode {
        public List<ExpressionNode> Nodes { get; }
        public ExpressionNode? Result { get; } = null;
        public List<ExpressionNode>? Parameters { get; } = null;

        public FunctionParameterNode(List<ExpressionNode> nodes) : base(Token.Range(nodes.First().Segment, nodes.Last().Segment), ExpressionKind.FunctionDefinitionExpression) {
            Nodes = nodes;
            this.Result = Nodes.Last();
            this.Parameters = Nodes.TakeWhile(n => n != this.Result).ToList();
        }

        public FunctionParameterNode(ExpressionNode node) : base(node.Segment, ExpressionKind.FunctionDefinitionExpression) {
            if (node is ParameterNode pNode) {
                Nodes = new List<ExpressionNode>() { pNode };
            }
            else if (node is FunctionParameterNode fNode) {
                Nodes = fNode.Nodes;
            }
            else {
                throw new System.Exception("");
            }
        }
        public FunctionParameterNode(ParameterNode node): base(node.Segment, ExpressionKind.FunctionDefinitionExpression) {
            Nodes = new List<ExpressionNode>() { node };
        }
        public FunctionParameterNode Add(ParameterNode node) {
            Nodes.Add(node);
            return this;
        }
        public FunctionParameterNode Add(FunctionParameterNode node) {
            Nodes.AddRange(node.Nodes);
            return this;
        }
        public FunctionParameterNode Add(ExpressionNode node) {
            if (node is ParameterNode pNode) {
                Nodes.Add(pNode);
                return this;
            }
            else if (node is FunctionParameterNode fNode) {
                Nodes.AddRange(fNode.Nodes);
                return this;
            }
            else {
                throw new System.Exception("");
            }
        }

        public override string ToString() {
            return string.Join(" -> ", Nodes.Select(p => p.ToString()));
        }
    }
}
