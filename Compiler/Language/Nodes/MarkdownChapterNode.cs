using Compiler.Symbols;
using System.Text.RegularExpressions;

namespace Compiler.Language.Nodes {
    public class MarkdownChapterNode : AstNode, IDocumentNode {
        public string? InterpolatedContent { get; set; } = null;
        public string Content { get; }
        public string Literal { get; }
        public bool IsTemplate { get; }
        public int Depth { get; }

        public MarkdownChapterNode(ISourceSegment segment, string content) : base(segment) {
            this.Content = content.Trim();
            this.Literal = content;

            this.IsTemplate = CarTemplating.TextTemplateRegEx.IsMatch(this.Content);

            if (content.StartsWith("#####")) this.Depth = 5;
            else if (content.StartsWith("####")) this.Depth = 4;
            else if (content.StartsWith("###")) this.Depth = 3;
            else if (content.StartsWith("##")) this.Depth = 2;
            else if (content.StartsWith("#")) this.Depth = 1;

            var regex = new Regex("#+");
            this.Content = regex.Replace(content, "").Trim();
        }

    }
}
