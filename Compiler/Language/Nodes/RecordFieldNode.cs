using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class RecordFieldNode : ExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public List<Token> TypesTokens { get; }
        public List<RestrictionNode> Restrictions { get; }

        public List<string> Types => TypesTokens.Select(t => t.Value).ToList();
        public AnnotationNode? AnnotationNode { get; }
        public string Description => AnnotationNode?.Annotation ?? "";

       
        public RecordFieldNode(AnnotationNode? annotation, Token identifierToken, List<Token> types, List<RestrictionNode> restrictions) : base(identifierToken, ExpressionKind.RecordField) {
            this.AnnotationNode = annotation;
            this.IdToken = identifierToken;
            this.TypesTokens = types;
            this.Restrictions = restrictions;
        }
    }
}
