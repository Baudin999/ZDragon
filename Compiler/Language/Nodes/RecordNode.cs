using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class RecordNode : ExpressionNode, ILanguageNode, IIdentifierExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public AnnotationNode? AnnotationNode { get; }
        public string Description => AnnotationNode?.Annotation ?? "";
        public List<Token> GenericParameters { get; }
        public List<Token> Extensions { get; }
        public List<RecordFieldNode> Fields { get; }

        public RecordNode(AnnotationNode? annotation, Token identifierToken, List<Token> genericParameters, List<Token> extensions, List<RecordFieldNode> fields) : base(identifierToken, ExpressionKind.RecordExpression) {
            this.AnnotationNode = annotation;
            this.IdToken = identifierToken;
            this.GenericParameters = genericParameters;
            this.Extensions = extensions;
            this.Fields = fields;
        }
       
    }
}
