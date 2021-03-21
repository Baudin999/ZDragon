using Compiler.Symbols;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;

namespace Compiler.Language.Nodes {
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
