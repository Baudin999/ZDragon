using Compiler;
using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Woezel.Transpilers.Html {
    public class HtmlTranspiler {
        private readonly List<string> parts = new List<string>();

        private void RenderChapter(MarkdownChapterNode mcn) {
            parts.Add($"<h{mcn.Depth}>{mcn.Content}</h{mcn.Depth}>");
        }

        private void RenderParagraph(IDocumentNode node) {
            parts.Add($"<p>{node.Content}</p>");
        }

        public string Go(CompilationCache cache, CompilationResult target) {

            foreach (var documentPart in target.Document) {
                if (documentPart is MarkdownChapterNode mcn) RenderChapter(mcn);
                else RenderParagraph(documentPart);
            }

            return string.Join("\n\n", parts);
        }
    }
}
