using System.Collections.Generic;

namespace Compiler.Symbols {
    public class TokenBlock {
        public IEnumerable<Token> Tokens { get; }
        public ContextType Context { get; }
        public TokenBlock(ContextType context, IEnumerable<Token> tokens) {
            this.Context = context;
            this.Tokens = tokens;
        }
    }
}
