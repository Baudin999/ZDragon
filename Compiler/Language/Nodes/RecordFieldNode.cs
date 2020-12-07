using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class RecordFieldNode : ExpressionNode, IIdentifierExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public List<Token> TypeTokens { get; }
        public List<RestrictionNode> Restrictions { get; }

        public List<string> Types => TypeTokens.Select(t => t.Value).ToList();
        public AnnotationNode? AnnotationNode { get; }
        public string Description => AnnotationNode?.Annotation ?? "";

       
        public RecordFieldNode(AnnotationNode? annotation, Token identifierToken, List<Token> types, List<RestrictionNode> restrictions) : base(identifierToken, ExpressionKind.RecordExpressionField) {
            this.AnnotationNode = annotation;
            this.IdToken = identifierToken;
            this.TypeTokens = types;
            this.Restrictions = restrictions;
        }
    }
}
