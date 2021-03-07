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
                .UseMediaLinks()
                .UseAdvancedExtensions()
                .Build();

            parts.Add(Markdown.ToHtml(System.Web.HttpUtility.HtmlEncode(node.Content), pipeline));
        }

        private void RenderViewNode(ViewNode node) {
            parts.Add($"<img style='max-width:100%;' src=\"/documents/{compilationresult.Namespace}/{node.Hash}.svg\" alt=\"data\" />");
        }

        private void RenderGuidelineNode(GuidelineNode node) {
            var title = node.GetAttribute("Title") ?? node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description", "");
            var rationale = node.GetAttribute("Rationale", "");
            var number = node.GetAttribute("Number", "000");

            parts.Add(@$"<div class='guideline'>
<title>GUIDELINE {number}: {title}</title>
<dl>
    <dt>Description</dt>
    <dd>{description}</dd>
    <dt>Rationale</dt>
    <dd>{rationale}</dd>
</dl>
</div>");
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
            var tocIndex = 1;
            var directiveNodes = this.compilationresult.Ast.TakeWhile(node => node is DirectiveNode).OfType<DirectiveNode>().ToList();
            if (directiveNodes.Count > 0) {
                tocIndex = 2;
                var doc_title = directiveNodes.FirstOrDefault(d => d.Id == "Title")?.Literal ?? "No title";
                var doc_author = directiveNodes.FirstOrDefault(d => d.Id == "Author")?.Literal ?? "No author";
                var doc_date = directiveNodes.FirstOrDefault(d => d.Id == "Date")?.Literal ?? "No date";

                parts.Add($@"
<div class='title-page'>
    <div class='title-page--title'>{doc_title}</div>
    <div class='title-page--author'>{doc_author}</div>
    <div class='title-page--date'>{doc_date}</div>
</div>
");
            }

            foreach (var documentPart in this.compilationresult.Document) {
                if (documentPart is MarkdownChapterNode markdownChapterNode) RenderChapter(markdownChapterNode);
                else if (documentPart is MarkdownNode markdownNode) RenderMarkdownNode(markdownNode);
                else if (documentPart is ViewNode viewNode) RenderViewNode(viewNode);
                else if (documentPart is GuidelineNode guidelineNode) RenderGuidelineNode(guidelineNode);
                else RenderParagraph(documentPart);
            }
            
            if (h1 > 1) {
                // Don't put in the TOC if there are no chapters...
                parts.Add("</div>");

                if (compilationresult.Lexicon.Values.OfType<ILanguageNode>().Where(ln => !(ln is ViewNode)).Count() > 0) {
                    toc.Add($"<div class='toc-1'>{++h1} Logical Data Model<div>");
                }
                if (compilationresult.Lexicon.Values.OfType<IArchitectureNode>().Count() > 0) {
                    toc.Add($"<div class='toc-1'>{++h1} Component Diagram<div>");
                }
                parts.Insert(tocIndex, string.Join("\n\n", toc));
            }


            if (compilationresult.Lexicon.Values.OfType<ILanguageNode>().Where(ln => !(ln is ViewNode)).Count() > 0) {
                // Don't put in the logical data model if there are no entities defined
                parts.Add("<div class='keep-together'><h1>Logical Data Model</h1>");
                parts.Add($"<img style='max-width:100%;' src=\"/documents/{compilationresult.Namespace}/data.svg\" alt=\"data\" /></div>");
            }

            if (compilationresult.Lexicon.Values.OfType<IArchitectureNode>().Count() > 0) {
                // Don't put in the architectural diagram if there are no architectural components defined
                parts.Add("<div class='keep-together'><h1>Component Diagram</h1>");
                parts.Add($"<img style='max-width:100%;' src=\"/documents/{compilationresult.Namespace}/components.svg\" alt=\"data\" /></div>");
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
