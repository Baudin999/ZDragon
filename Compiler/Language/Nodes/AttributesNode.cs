using Compiler.Symbols;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;

namespace Compiler.Language.Nodes {
    public class AttributesNode : ExpressionNode, IIdentifierExpressionNode {
        public Token IdToken { get; }
        public string Id => IdToken.Value.Trim();
        public List<AttributeNode> Attributes { get; }
        public bool Imported { get; set; } = false;
        public string? ImportedFrom { get; set; } = null;
        public List<Token> Extensions { get; }

        public string Title => GetAttribute("Title") ?? GetAttribute("Name") ?? Id;

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

    public class AttributeNode : AstNode {
        public Token KeyToken { get; }
        public List<Token> ValueToken { get; }
        public string Key => KeyToken.Value;
        public string Value { get; }

        public IEnumerable<IEnumerable<Token>> ItemsTokens { get; }
        public List<string> Items { get; }

        public AttributeNode(Token key, IEnumerable<Token> value, IEnumerable<IEnumerable<Token>> items) : base(value.Count() > 0 ? Token.Range(key, value.Last()) : key) {
            this.KeyToken = key;
            this.ValueToken = value.ToList();
            this.Value = string.Join("", value.Select(v => v.Value)).Trim();
            this.ItemsTokens = items;
            this.Items = items
                .Select(i => string.Join("", i.Select(_i => _i.Value)).Trim())
                .ToList();
        }


        public T? Convert<T>() {
            try {
                var converter = TypeDescriptor.GetConverter(typeof(T));
                if (converter != null) {
                    return (T)converter.ConvertFromString(this.Value);
                }
                return default(T);
            }
            catch (NotSupportedException) {
                return default(T);
            }
        }
    }



}
