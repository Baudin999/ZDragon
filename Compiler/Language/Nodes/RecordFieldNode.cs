using Compiler.Symbols;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class RecordFieldNode : ExpressionNode, IIdentifierExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public List<Token> TypeTokens { get; }
        public List<RestrictionNode> Restrictions { get; }
        public bool IsCloned { get; }
        public string Type => string.Join(" ", Types);

        public List<string> Types => TypeTokens.Select(t => t.Value).ToList();
        public bool IsList => Types.Count > 0 && Types.First() == "List";
        public bool IsMaybe => Types.Count > 0 && Types.First() == "Maybe";
        public AnnotationNode? AnnotationNode { get; }
        public string Description => AnnotationNode?.Annotation ?? "";
        public List<DirectiveNode> Directives { get; }
        public bool Imported { get; set; } = false;
        public string? ImportedFrom { get; set; } = null;


        public RecordFieldNode(AnnotationNode? annotation, IEnumerable<DirectiveNode> directives, Token identifierToken, IEnumerable<Token> types, IEnumerable<RestrictionNode> restrictions, bool cloned = false) : base(identifierToken, ExpressionKind.RecordExpressionField) {
            this.AnnotationNode = annotation;
            this.IdToken = identifierToken;
            this.TypeTokens = types.ToList();
            this.Restrictions = restrictions.ToList();
            this.IsCloned = cloned;

            this.Directives = directives.ToList();
        }

        internal RecordFieldNode Clone() {
            return new RecordFieldNode(
                this.AnnotationNode?.Clone(),
                this.Directives.Select(d => d.Clone()),
                this.IdToken.Clone(),
                this.TypeTokens.Select(t => t.Clone()),
                this.Restrictions.Select(r => r.Clone()),
                true
            );
        }

        public override AstNode Copy() {
            return Clone();
        }

    }
}
