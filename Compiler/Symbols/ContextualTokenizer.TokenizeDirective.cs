using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Symbols {


    /// <summary>
    /// 
    /// </summary>
    internal partial class ContextualTokenizer {
        //private readonly List<SyntaxKind> directiveTransformations =  new List<SyntaxKind> { SyntaxKind.EndKeywordToken };
        private TokenGroup TokenizeDirective() {
            var tokens = new List<Token?>();
            while (Current != null && !IsEndBlock()) {
                var t = TakeF();
                if (t.Kind == SyntaxKind.EndKeywordToken) {
                    var newToken = new Token(t.Value, SyntaxKind.IdentifierToken, t);
                    tokens.Add(newToken);
                } else {
                    tokens.Add(t); 
                }
            }

            tokens.Add(new Token(SyntaxKind.EndDirective));

            return new TokenGroup(ContextType.DirectiveDeclaration, tokens);
        }
    }
}
