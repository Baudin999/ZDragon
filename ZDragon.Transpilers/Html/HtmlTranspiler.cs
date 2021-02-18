using Compiler;
using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace ZDragon.Transpilers.Html {
    public class HtmlTranspiler {

        private readonly List<string> parts = new List<string> {
            html_markup,
            "<div class=\"content\">"
        };

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

            parts.Add("</div>");
            return string.Join("\n\n", parts);
        }

        private static readonly string html_markup = @"
<style>

body{counter-reset: section}
h2{counter-reset: sub-section}
h3{counter-reset: composite}
h4{counter-reset: detail}

h2:before {
    counter-increment: section;
    content: counter(section) "" "";
}
h3:before {
    counter-increment: sub-section;
    content: counter(section) ""."" counter(sub-section) "" "";
}
h4:before {
    counter-increment: composite;
    content: counter(section) ""."" counter(sub-section) ""."" counter(composite) "" "";
}
h5:before{
    counter-increment: detail;
    content: counter(section) ""."" counter(sub-section) ""."" counter(composite) ""."" counter(detail) "" "";
}

.content {
    padding: 2cm;
    font-familly: verdana;
}

.content h1 {
    text-transform: uppercase;
    font-size: 1.2rem;

}

</style>
";
    }
}
