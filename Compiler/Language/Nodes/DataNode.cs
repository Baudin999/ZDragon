using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class DataNode : ExpressionNode, IIdentifierExpressionNode {
        public AnnotationNode Annotation { get; }
        public string Description => Annotation.Annotation;
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public List<Token> GenericParameters { get; }
        public List<DataFieldNode> Fields { get; }

        public DataNode(AnnotationNode annotationNode, Token id, List<Token> genericParameters, List<DataFieldNode> fields) : base(id, ExpressionKind.DataExpression) {
            this.Annotation = annotationNode;
            this.IdToken = id;
            this.GenericParameters = genericParameters;
            this.Fields = fields;
        }

    }
}
