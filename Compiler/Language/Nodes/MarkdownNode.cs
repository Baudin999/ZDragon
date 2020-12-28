using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class MarkdownNode : AstNode, IDocumentNode {
        public string Content { get; }
        public string Literal { get; }

        public MarkdownNode(string markdown, ISourceSegment sourceSegment) : base(sourceSegment) {
            this.Content = markdown.Trim();
            this.Literal = markdown;
        }

    }
}
