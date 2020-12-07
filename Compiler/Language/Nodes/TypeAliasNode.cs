using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class TypeAliasNode : ExpressionNode, IIdentifierExpressionNode {
        public Token IdToken { get; private set; }
        public string Id => IdToken.Value;
        public IEnumerable<Token> GenericParameters { get; private set; }
        public ExpressionNode Body { get; private set; }
        public AnnotationNode Annotation { get; }

        public TypeAliasNode(ISourceSegment sourceSegment, AnnotationNode annotationNode, Token id, IEnumerable<Token> genericParameters, ExpressionNode body): base(sourceSegment, ExpressionKind.AliasExpression) {
            this.IdToken = id;
            this.GenericParameters = genericParameters;
            this.Body = body;
            this.Annotation = annotationNode;
        }

        public override string ToString() {
            return $"alias {IdToken.Value}";
        }
    }
}
