using Compiler;
using Compiler.Language.Nodes;
using Markdig;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace ZDragon.Transpilers.Html {
    public class FragmentTranspiler {

        private readonly Dictionary<string, IDocumentNode> Document;

        public string Namespace { get; }

        private readonly List<string> parts = new List<string>();


        private void RenderChapterNode(MarkdownChapterNode mcn) {

            parts.Add($"<h{mcn.Depth}>{mcn.Content}</h{mcn.Depth}>");
        }

        private void RenderParagraphNode(IDocumentNode node) {
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

        private void RenderViewNode(ViewNode node) {
            parts.Add($"<img style='max-width:100%;' src=\"/documents/{Namespace}/{node.Hash}.svg\" alt=\"data\" />");
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

        private void RenderRequirementNode(RequirementNode node) {
            var title = node.GetAttribute("Title") ?? node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description", "");
            var rationale = node.GetAttribute("Rationale", "");
            var number = node.GetAttribute("Number", "000");

            parts.Add(@$"<div class='requirement'>
<title>REQUIREMENT {number}: {title}</title>
<dl>
    <dt>Description</dt>
    <dd>{description}</dd>
    <dt>Rationale</dt>
    <dd>{rationale}</dd>
</dl>
</div>");
        }


        public FragmentTranspiler(string ns, Dictionary<string, IDocumentNode> document) {
            this.Document = document;
            this.Namespace = ns;
        }



        public string Transpile() {

            var endpoints = Document.Values.OfType<EndpointNode>().ToList();

            foreach (var documentPart in this.Document.Values) {
                if (documentPart is MarkdownChapterNode markdownChapterNode) RenderChapterNode(markdownChapterNode);
                else if (documentPart is MarkdownNode markdownNode) RenderMarkdownNode(markdownNode);
                else if (documentPart is ViewNode viewNode) RenderViewNode(viewNode);
                else if (documentPart is GuidelineNode guidelineNode) RenderGuidelineNode(guidelineNode);
                else if (documentPart is RequirementNode requriementNode) RenderRequirementNode(requriementNode);
                else RenderParagraphNode(documentPart);
            }

            
            return string.Join("\n\n", parts);
        }

    }
}
