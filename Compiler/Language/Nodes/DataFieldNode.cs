using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class DataFieldNode : ExpressionNode, IIdentifierExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public List<Token> TypesTokens { get; }
        public List<string> Types => TypesTokens.Select(t => t.Value).ToList();
        public AnnotationNode? AnnotationNode { get; }
        public string Description => AnnotationNode?.Annotation ?? "";

       
        public DataFieldNode(AnnotationNode? annotation, Token id, List<Token> types) : base(id, ExpressionKind.DataExpression) {
            this.AnnotationNode = annotation;
            this.IdToken = id;
            this.TypesTokens = types;
        }
    }
}
