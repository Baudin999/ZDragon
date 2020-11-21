using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class MarkdownNode : AstNode {
        public string Markdown { get; }

        public MarkdownNode(string markdown, ISourceSegment sourceSegment) : base(sourceSegment) {
            this.Markdown = markdown.Trim();
        }

    }
}
