using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language.Nodes {
    public class TypeAliasNode : ExpressionNode, ILanguageNode, IIdentifierExpressionNode {
        public Token IdToken { get; private set; }
        public string Id => IdToken.Value;
        public List<Token> GenericParameters { get; private set; }
        public ExpressionNode Body { get; private set; }
        public AnnotationNode AnnotationNode { get; }
        public List<RestrictionNode> Restrictions { get; }
        public string Description => AnnotationNode.Annotation ?? "";


        public TypeAliasNode(
                ISourceSegment sourceSegment, 
                AnnotationNode annotationNode, 
                Token id, 
                List<Token> genericParameters, 
                ExpressionNode body, 
                List<RestrictionNode>? restrictions = null) : base(sourceSegment, ExpressionKind.AliasExpression) {

            this.IdToken = id;
            this.GenericParameters = genericParameters;
            this.Body = body;
            this.AnnotationNode = annotationNode;
            this.Restrictions = restrictions ?? new List<RestrictionNode>() ;
        }

        public override string ToString() {
            return $"alias {IdToken.Value}";
        }
    }
}
