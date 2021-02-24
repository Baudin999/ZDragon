using Compiler;
using Compiler.Language.Nodes;
using Markdig;
using System.Collections.Generic;
using System.Linq;

namespace ZDragon.Transpilers.Html {
    public class HtmlTranspiler {
        private readonly List<string> toc = new List<string> {
            "<h1>Table of Contents</h1>",
            "<div class='toc'>",
            "<div class='toc-1'>1 Table of Contents<div>"
        };
        private readonly CompilationResult compilationresult;
        private readonly List<string> parts = new List<string>();

        private int h1 = 1;
        private int h2 = 0;
        private int h3 = 0;
        private int h4 = 0;
        private int h5 = 0;

        private void RenderChapter(MarkdownChapterNode mcn) {
            if (mcn.Depth == 1) {
                h1 = h1 + 1;
                h2 = 0;
                h3 = 0;
                h4 = 0;
                h5 = 0;
                if (h1 > 2) {
                    parts.Add("</div>");
                }
                parts.Add("<div class='keep-together'>");
                toc.Add($"<div class='toc-1'>{h1} {mcn.Content}<div>");
            }
            else if (mcn.Depth == 2) {
                h2 = h2 + 1;
                h3 = 0;
                h4 = 0;
                h5 = 0;
                toc.Add($"<div class='toc-2'>{h1}.{h2} {mcn.Content}</div>");
            }
            else if (mcn.Depth == 3) {
                h3 = h3 + 1;
                h4 = 0;
                h5 = 0;
                toc.Add($"<div class='toc-3'>{h1}.{h2}.{h3} {mcn.Content}</div>");
            }
            else if (mcn.Depth == 4) {
                h4 = h4 + 1;
                h5 = 0;
                toc.Add($"<div class='toc-4'>{h1}.{h2}.{h3}.{h4} {mcn.Content}</div>");
            }
            else if (mcn.Depth == 5) {
                h5 = h5 + 1;
                toc.Add($"<div class='toc-5'>{h1}.{h2}.{h3}.{h4}.{h5} {mcn.Content}</div>");
            }



            parts.Add($"<h{mcn.Depth}>{mcn.Content}</h{mcn.Depth}>");
        }

        private void RenderParagraph(IDocumentNode node) {
            parts.Add($"<p>{node.Content}</p>");
        }

        private void RenderMarkdownNode(MarkdownNode node) {
            var pipeline = new MarkdownPipelineBuilder()
                .UsePipeTables()
                .UseTaskLists()
                .UseAdvancedExtensions()
                .Build();

            parts.Add(Markdown.ToHtml(node.Content, pipeline));
        }

        public HtmlTranspiler(CompilationResult compilationResult) {
            this.compilationresult = compilationResult;
        }

        public string Transpile() {
            parts.Add($@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <title>ZDragon</title>
    <base href='/'>

    <link rel='stylesheet' type='text/css' href='https://cdn.rawgit.com/dreampulse/computer-modern-web-font/master/fonts.css' />
    <link rel='stylesheet' type='text/css' href='/page-styles.css' media='all' />
    <link rel='stylesheet' type='text/css' href='/prism.css' />
</head>
<body>
<div class='content'>
");
            foreach (var documentPart in this.compilationresult.Document) {
                if (documentPart is MarkdownChapterNode mcn) RenderChapter(mcn);
                else if (documentPart is MarkdownNode mdn) RenderMarkdownNode(mdn);
                else RenderParagraph(documentPart);
            }
            
            if (h1 > 2) {
                // Don't put in the TOC if there are no chapters...
                parts.Add("</div>");
                parts.Insert(1, string.Join("\n\n", toc));
            }


            if (compilationresult.Lexicon.Values.OfType<ILanguageNode>().Count() > 0) {
                // Don't put in the logical data model if there are no entities defined
                parts.Add("<div class='keep-together'><h1>Logical Data Model</h1>");
                parts.Add($"<img src=\"/documents/{compilationresult.Namespace}/data.svg\" alt=\"data\" /></div>");
            }

            if (compilationresult.Lexicon.Values.OfType<IArchitectureNode>().Count() > 0) {
                // Don't put in the architectural diagram if there are no architectural components defined
                parts.Add("<div class='keep-together'><h1>Component Diagram</h1>");
                parts.Add($"<img src=\"/documents/{compilationresult.Namespace}/components.svg\" alt=\"data\" /></div>");
            }

            parts.Add(@"
    <script src='prism.js'></script>
</div>
</body>
</html>
");
            return string.Join("\n\n", parts);
        }

//        private static readonly string html_markup = @"
//<style>


//</style>
//";
    }
}
