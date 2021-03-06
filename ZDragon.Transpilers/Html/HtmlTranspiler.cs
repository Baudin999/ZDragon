using Compiler;
using Compiler.Language.Nodes;
using Markdig;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace ZDragon.Transpilers.Html {
    public class HtmlTranspiler {
        private readonly List<string> toc = new List<string> {
            "<div class='keep-together'><h1>Table of Contents</h1>",
            "<div class='toc'>",
            "<div class='toc-1'>1 Table of Contents</div>"
        };
        private readonly CompilationResult compilationresult;
        private readonly MarkdownPipeline pipeline;
        private readonly List<string> parts = new List<string>();

        private int h1 = 1;
        private int h2 = 0;
        private int h3 = 0;
        private int h4 = 0;
        private int h5 = 0;

        private void RenderChapterNode(MarkdownChapterNode mcn) {
            var content = mcn.InterpolatedContent ?? mcn.Content;
            if (mcn.Depth == 1) {
                // close the keep-together parts
                if (h1 > 1) parts.Add("</div>");
                //if (h2 > 0) parts.Add("</div>");

                h1 += 1;
                h2 = 0;
                h3 = 0;
                h4 = 0;
                h5 = 0;
                
                parts.Add("<div class='keep-together'>");
                toc.Add($"<div class='toc-1'>{h1} {content}</div>");
            }
            else if (mcn.Depth == 2) {
                // close the keep-together parts
                //if (h2 > 0) parts.Add("</div>");
                h2 += 1;
                h3 = 0;
                h4 = 0;
                h5 = 0;

                //parts.Add("<div class='keep-together'>");
                toc.Add($"<div class='toc-2'>{h1}.{h2} {content}</div>");
            }
            else if (mcn.Depth == 3) {
                h3 += 1;
                h4 = 0;
                h5 = 0;
                toc.Add($"<div class='toc-3'>{h1}.{h2}.{h3} {content}</div>");
            }
            else if (mcn.Depth == 4) {
                h4 += 1;
                h5 = 0;
                toc.Add($"<div class='toc-4'>{h1}.{h2}.{h3}.{h4} {content}</div>");
            }
            else if (mcn.Depth == 5) {
                h5 += 1;
                toc.Add($"<div class='toc-5'>{h1}.{h2}.{h3}.{h4}.{h5} {content}</div>");
            }

            parts.Add($"<h{mcn.Depth}>{content}</h{mcn.Depth}>");
        }

        private string ToHtml(string content) {
            return Markdown.ToHtml(content, pipeline);
        }
        //private string Interpolate(string content) {
        //    return CarTemplating.FormatTemplate(content, this.compilationresult.Lexicon);
        //}

        private void RenderParagraphNode(IDocumentNode node) {
            parts.Add($"<p>{node.InterpolatedContent ?? node.Content}</p>");
        }

        private void RenderMarkdownNode(MarkdownNode node) {
            var content = node.IsTemplate ? node.InterpolatedContent : node.Content;
            parts.Add(ToHtml(node.InterpolatedContent ?? node.Content));
        }


        private void RenderEndpointNode(EndpointNode node) {
            var description = node.GetAttribute("Description") ?? "";
            var markdown = ToHtml(node.GetAttribute("Documentation") ?? description);
            var method = node.GetAttribute("Method", "GET").ToUpper();

            var parameters = new List<string>();
            var url = node.GetAttribute("Url");
            if (url != null) {
                var regex = new Regex("\\{(.*?)\\}");
                var matches = regex.Matches(url);
                foreach (Match match in matches) {
                    parameters.Add(match.Value);
                }
            }
            var parametersString = string.Join(", ", parameters);
            if (parametersString == string.Empty) parametersString = "none";

            var typeDefinition = node.TypeDefinition is null ? "missing" : node.TypeDefinition.ToString();

            toc.Add($"<div class='toc-1'>{++h2} {node.Title}<div>");
            parts.Add($@"
<div class='keep-together'>
    <h2>{node.Title}</h2>
    {markdown}
    <div class='endpoint'>
    <div class='title'><span class='endpoint--method'>{method}</span> {url}</div>
    <table>
        <tbody>
            <tr>
                <td>Url</td>
                <td>{url ?? "missing"}</td>    
            </tr>
            <tr>
                <td>Parameters</td>
                <td>{parametersString}</td>    
            </tr>
            <tr>
                <td>Function</td>
                <td>{typeDefinition}</td>    
            </tr>
            <tr>
                <td>Description</td>
                <td>{description ?? "missing"}</td>    
            </tr>
        </tbody>
    </table>
    </div>
</div>
");

        }

        public HtmlTranspiler(CompilationResult compilationResult) {
            this.compilationresult = compilationResult;
            this.pipeline = new MarkdownPipelineBuilder()
                .UsePipeTables()
                .UseTaskLists()
                .UseAdvancedExtensions()
                .Build();
        }

        private int RenderTitlePage(int tocIndex) {
            var directiveNodes = this.compilationresult.Ast.TakeWhile(node => node is DirectiveNode).OfType<DirectiveNode>().ToList();
            if (directiveNodes.Count > 0) {
                tocIndex++;
                var doc_title = directiveNodes.FirstOrDefault(d => d.Id == "title")?.Literal ?? "No title";
                var doc_author = directiveNodes.FirstOrDefault(d => d.Id == "author")?.Literal ?? "No author";
                var doc_date = directiveNodes.FirstOrDefault(d => d.Id == "date")?.Literal ?? "No date";
                var doc_image = directiveNodes.FirstOrDefault(d => d.Id == "image")?.Literal ?? "/standalone-icon.png";

                parts.Add($@"
<div class='title-page'>
    <div class='title-page--title'>{doc_title}</div>
    <div class='title-page--author'>{doc_author}</div>
    <div class='title-page--date'>{doc_date}</div>
    <img style='max-width:100%;' src='{doc_image}' />
</div>
");
            }

            return tocIndex;
        }

        public string Transpile() {
            var renderRoadmap = bool.Parse(compilationresult.Ast.OfType<DirectiveNode>().FirstOrDefault(d => d.Key == "roadmap")?.Value.ToLower() ?? "true");

            var hasArchitectureNodes = compilationresult.Lexicon.Values.OfType<IArchitectureNode>().Any();
            var renderComponents = compilationresult.ParseBooleanDirective("components") ?? true && hasArchitectureNodes;
            var renderComponentDetails = compilationresult.ParseBooleanDirective("component details") ?? false;
            
            var hasLanguageNodes = compilationresult.Lexicon.Values.OfType<ILanguageNode>().Where(ln => !(ln is ViewNode)).Any();
            var renderClasses = compilationresult.ParseBooleanDirective("classes") ?? true && hasLanguageNodes;
            var renderClassDetails = compilationresult.ParseBooleanDirective("class details") ?? false;

            var endpoints = compilationresult.Lexicon.Values.OfType<EndpointNode>().ToList();

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
            tocIndex = RenderTitlePage(tocIndex);

            if (renderClasses && compilationresult.Lexicon.Values.OfType<IPlanningNode>().Any()) {

                toc.Add($"<div class='toc-1'>{++h1} Roadmap</div>");

                // Don't put in the roadmap in if there are no planning nodes defined
                parts.Add("</div>");
                if (h2 > 0) parts.Add("</div>");
                parts.Add("<div class='keep-together'><h1>Roadmap</h1>");
                parts.Add($"<img style='max-width:100%;min-width:100%;' src=\"/documents/{compilationresult.Namespace}/roadmap.svg?{System.DateTime.Now.Ticks}\" alt=\"data\" /></div>");
            }

            foreach (var documentPart in this.compilationresult.Document) {
                if (documentPart is MarkdownChapterNode markdownChapterNode) RenderChapterNode(markdownChapterNode);
                else if (documentPart is MarkdownNode markdownNode) RenderMarkdownNode(markdownNode);
                else if (documentPart is IncludeNode includeNode) {
                    parts.Add(FragmentTranspiler.RenderIncludeNode(includeNode));
                }
                else if (documentPart is ViewNode viewNode) {
                    //if (viewNode.Imported && viewNode.OriginalNamespace != null) parts.Add(FragmentTranspiler.RenderViewNode(viewNode, viewNode.OriginalNamespace));
                    //else 
                    parts.Add(FragmentTranspiler.RenderViewNode(viewNode, compilationresult.Namespace));
                }
                else if (documentPart is GuidelineNode guidelineNode) {
                    parts.Add(FragmentTranspiler.RenderGuidelineNode(guidelineNode));
                }
                else if (documentPart is RequirementNode requriementNode) {
                    parts.Add(FragmentTranspiler.RenderRequirementNode(requriementNode));
                }
                else if (documentPart is EndpointNode endpointNode) {
                    /* Do nothing, we will render the endpoints at the back of the document */
                }
                else RenderParagraphNode(documentPart);
            }


            if (h1 > 1) {
                
                if (endpoints.Count > 0) {
                    toc.Add($"<div class='toc-1'>{++h1} Endpoints</div>");
                    h2 = 0;
                    h3 = 3;
                    foreach (var ep in endpoints) {
                        toc.Add($"<div class='toc-2'>{h1}.{++h2} {ep.Title}</div>");
                    }
                }

                if (renderClasses) {
                    h2 = 0;
                    h3 = 0;
                    toc.Add($"<div class='toc-1'>{++h1} Logical Data Model</div>");

                    if (renderComponentDetails) {
                        this.compilationresult.Ast.OfType<RecordNode>().ToList().ForEach(n => {
                            toc.Add($"<div class='toc-2'>{h1}.{++h2} {n.Id}</div>");
                        });
                    }
                }

                if (renderComponents) {
                    h2 = 0;
                    h3 = 0;
                    toc.Add($"<div class='toc-1'>{++h1} Component Diagram</div>");

                    if (renderComponentDetails) {
                        ValidAttributesNodes().ToList().ForEach(n => {
                            toc.Add($"<div class='toc-2'>{h1}.{++h2} {n.Id}</div>");
                        });
                    }
                }

                // Don't put in the TOC if there are no chapters...
                toc.Add("</div></div>");

                parts.Insert(tocIndex, string.Join("\n\n", toc));
            }
            
            if (endpoints.Count > 0) {
                parts.Add($"<h1>Endpoints</h1>");
                parts.Add($"<p>This segment describes the endpoints defined in the document.</p>");
                endpoints.ForEach(RenderEndpointNode);
            }

            if (renderClasses) {
                // Don't put in the logical data model if there are no entities defined
                parts.Add("<div class='keep-together'><h1>Logical Data Model</h1>");
                parts.Add($"<img style='max-width:100%;' src=\"/documents/{compilationresult.Namespace}/data.svg?{System.DateTime.Now.Ticks}\" alt=\"data\" />");

                if (renderClassDetails) {
                    foreach (var node in this.compilationresult.Ast.OfType<ILanguageNode>().OrderBy(n => n.Id)) {
                        if (node is RecordNode rn) {
                            parts.Add(FragmentTranspiler.RenderRecordTable(rn));
                        }
                        else if (node is ChoiceNode cn) {
                            parts.Add(FragmentTranspiler.RenderChoiceTable(cn));
                        }
                        else if (node is DataNode dn) {
                            parts.Add(FragmentTranspiler.RenderDataTable(dn));
                        }
                    }
                }

                parts.Add("</div>");
            }

            if (renderComponents) {
                // Don't put in the architectural diagram if there are no architectural components defined
                parts.Add("<div class='keep-together'><h1>Component Diagram</h1>");
                parts.Add($"<img style='max-width:100%;' src=\"/documents/{compilationresult.Namespace}/components.svg?{System.DateTime.Now.Ticks}\" alt=\"data\" />");

                if (renderComponentDetails) {
                    foreach (var node in ValidAttributesNodes()) {
                        parts.Add(FragmentTranspiler.RenderAttributesTable(node));
                    }
                }
                parts.Add("</div>");
            }

            parts.Add(@"
    <script src='prism.js'></script>

</div>
</body>
</html>
");
            return string.Join("\n\n", parts);
        }

        private IEnumerable<AttributesNode> ValidAttributesNodes() {
            return this.compilationresult.Ast.OfType<AttributesNode>().Where(a => a.GetAttribute("Hidden", "False").ToLower() == "false").OrderBy(n => n.Id);
        }

    }
}
