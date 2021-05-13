using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class ViewNode : ExpressionNode, IIdentifierExpressionNode, ILanguageNode, IDocumentNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value;

        public AnnotationNode Annotation { get; }
        public List<Token> Nodes { get; }

        public byte[] Hash { get; }
        public string HashString { get; }

        public string Content => "";

        public string Literal => "";
        public bool IsTemplate => false;

        public string UrlNamespace { get; set; } = "";

        public ViewNode(AnnotationNode annotationNode, Token id, List<Token>nodes) : base(id, ExpressionKind.ViewExpression) {
            this.Annotation = annotationNode;
            this.IdToken = id;
            this.Nodes = nodes;

            var s = Id + string.Join("", nodes.Select(n => n.Value));
            this.Hash = Utilities.HashString(s);
            this.HashString = Utilities.ByteArrayToString(this.Hash);
        }
    }
}
