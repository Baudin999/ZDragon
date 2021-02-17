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
            parts.Add("<h1>Logical Data Model</h1>");
            parts.Add($"<img src=\"/documents/data.svg\" alt=\"data\" />");

            parts.Add("<h1>Component Diagram</h1>");
            parts.Add($"<img src=\"/documents/components.svg\" alt=\"data\" />");

            return string.Join("\n\n", parts);
        }
    }
}
