using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {
    public class TokenGroup {
        public IEnumerable<Token> Tokens { get; }
        public string Text => string.Join("", this.Tokens.Select(t => t.Value));
        public ContextType Context { get; }
        public TokenGroup(ContextType context, IEnumerable<Token?> tokens) {
            this.Context = context;
            this.Tokens = (IEnumerable<Token>)tokens.Where(t => t != null);
        }
    }
}
