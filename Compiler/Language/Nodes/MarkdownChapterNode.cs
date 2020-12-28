using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class MarkdownChapterNode : AstNode, IDocumentNode {
        public string Content { get; }
        public string Literal { get; }

        public MarkdownChapterNode(ISourceSegment segment, string content) : base(segment) {
            this.Literal = content;
            this.Content = content.Replace("#", "").Trim();
        }

    }
}
