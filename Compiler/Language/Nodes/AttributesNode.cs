using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class AttributesNode : ExpressionNode, IIdentifierExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value.Trim();
        public List<AttributeNode> Attributes { get; private set;  }
        public List<Token> Extensions { get; }
        public AnnotationNode? AnnotationNode { get; }

        public string Title => GetAttribute("Title") ?? GetAttribute("Name") ?? Id;
        public string? Description => GetAttribute("Description");

        public string? GetAttribute(string name) {
            return this.Attributes.FirstOrDefault(a => a.Key == name)?.Value.Trim();
        }
        public bool HasAttribute(string name) {
            return this.Attributes.FirstOrDefault(a => a.Key == name) != null;
        }

        public AttributeNode? GetAttributeNode(string name) {
            return this.Attributes.FirstOrDefault(a => a.Key == name);
        }

        public List<string>? GetAttributeItems(string name) {
            return this.Attributes.FirstOrDefault(a => a.Key == name)?.Items.Select(i => i.Trim()).ToList();
        }
        public List<string> GetAttributeItems(string name, List<string> def) {
            return GetAttributeItems(name) ?? def;
        }

        public string GetAttribute(string name, string _default) {
            return this.Attributes.FirstOrDefault(a => a.Key == name)?.Value ?? _default;
        }

        public void SetAttribute(AttributeNode node) {
            if (Attributes.Any(a => a.Key == node.Key)) {
                this.Attributes = Attributes.Where(a => a.Key != node.Key).ToList();
            }
            this.Attributes.Add((AttributeNode)node.Copy());
        }

        public AttributesNode(ISourceSegment segment, AnnotationNode? annotationNode, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes, ExpressionKind kind) : base(segment, kind) {
            this.IdToken = name;
            this.Attributes = attributes.ToList();
            this.Extensions = extensions;
            this.AnnotationNode = annotationNode;
        }

        public override string ToString() {
            return Id;
        }

        public override string Hydrate() {

            var t = this switch {
                SystemNode s => "system",
                ComponentNode s => "component",
                PersonNode s => "person",
                RequirementNode s => "requirement",
                GuidelineNode s => "guideline",
                _ => "component"
            };


            if (this.Attributes.Count == 0) {
                return @$"
{this.AnnotationNode?.AnnotationTokens.Select(a => a.Value).PadAndJoin("", System.Environment.NewLine)}
{t} {Id}
".Trim();
            }
            else {
                return @$"
{this.AnnotationNode?.AnnotationTokens.Select(a => a.Value).PadAndJoin("", System.Environment.NewLine)}
{t} {Id} =
{string.Join(System.Environment.NewLine, Attributes.Select(f => f.Hydrate()))}
".Trim();
            }

        }
    }



}
