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
        public bool Imported { get; set; } = false;
        public string? ImportedFrom { get; set; } = null;

        public RecordNode(AnnotationNode? annotation, Token identifierToken, List<Token> genericParameters, List<Token> extensions, List<RecordFieldNode> fields) : base(identifierToken, ExpressionKind.RecordExpression) {
            this.AnnotationNode = annotation;
            this.IdToken = identifierToken;
            this.GenericParameters = genericParameters;
            this.Extensions = extensions;
            this.Fields = fields;
        }

        public override AstNode Copy() {
            return new RecordNode(
                this.AnnotationNode?.Clone(),
                this.IdToken.Clone(),
                this.GenericParameters.Select(g => g.Clone()).ToList(),
                this.Extensions.Select(g => g.Clone()).ToList(),
                this.Fields.Select(g => g.Clone()).ToList()
                );
        }

    }
}
