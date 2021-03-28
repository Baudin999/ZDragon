using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class AttributesNode : ExpressionNode, IIdentifierExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value.Trim();
        public List<AttributeNode> Attributes { get; }
        public List<Token> Extensions { get; }

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

        public AttributesNode(ISourceSegment segment, Token name, List<Token> extensions, IEnumerable<AttributeNode> attributes, ExpressionKind kind) : base(segment, kind) {
            this.IdToken = name;
            this.Attributes = attributes.ToList();
            this.Extensions = extensions;
        }

        public override string ToString() {
            return Id;
        }
    }



}
