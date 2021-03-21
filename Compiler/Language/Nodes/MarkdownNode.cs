using Compiler.Symbols;
using System.Collections.Generic;


namespace Compiler.Language.Nodes {
    public class MarkdownNode : AstNode, IDocumentNode {
        public string Content { get; }
        public string Literal { get; }
        public bool IsTemplate { get; }

        public MarkdownNode(string markdown, ISourceSegment sourceSegment) : base(sourceSegment) {
            this.Content = markdown.Trim();
            this.Literal = markdown;
            this.IsTemplate = CarTemplating.TextTemplateRegEx.IsMatch(this.Content);
        }

        public string Interpolate(Dictionary<string, IIdentifierExpressionNode> lexicon) {
            return this.Content.FormatTemplate(lexicon);
        }

    }

}
