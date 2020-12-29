using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Symbols {


    /// <summary>
    /// 
    /// </summary>
    internal partial class ContextualTokenizer {
        private TokenGroup TokenizeDirective() {
            var tokens = new List<Token?>();
            while (!IsEndBlock()) {
                tokens.Add(Take()); 
            }

            Take();
            tokens.Add(Token.EndBlock);

            return new TokenGroup(ContextType.DirectiveDeclaration, tokens);
        }
    }
}
