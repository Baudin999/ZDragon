using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {
    public class TokenBlock {
        public IEnumerable<Token> Tokens { get; }
        public string Text => string.Join("", this.Tokens.Select(t => t.Value));
        public ContextType Context { get; }
        public TokenBlock(ContextType context, IEnumerable<Token> tokens) {
            this.Context = context;
            this.Tokens = tokens;
        }
    }
}
