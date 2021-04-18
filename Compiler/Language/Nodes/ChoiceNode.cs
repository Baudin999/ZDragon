using Compiler.Symbols;
using Compiler.Language;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class ChoiceNode : ExpressionNode, ILanguageNode, IIdentifierExpressionNode {
        public AnnotationNode Annotation { get; }
        public string Description => Annotation.Annotation;
        public Token IdToken { get; }
        public string Id => IdToken.Value;
        public List<ChoiceFieldNode> Fields { get; }

        public ChoiceNode(AnnotationNode annotationNode, Token id, List<ChoiceFieldNode> fields) : base(id, ExpressionKind.ChoiceExpression) {
            this.Annotation = annotationNode;
            this.IdToken = id;
            this.Fields = fields;
        }

        public override string Hydrate() {
            return $@"
{this.Annotation.AnnotationTokens.Select(a => a.Value).PadAndJoin("", System.Environment.NewLine)}
choice {Id} =
{string.Join(System.Environment.NewLine, Fields.Select(f => f.Hydrate()))}
".Trim();
        }

    }
}
