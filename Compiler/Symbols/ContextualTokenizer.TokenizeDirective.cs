using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Symbols {


    /// <summary>
    /// 
    /// </summary>
    internal partial class ContextualTokenizer {
        private readonly List<SyntaxKind> directiveTransformations =  new List<SyntaxKind> { SyntaxKind.EndKeywordToken };
        private TokenGroup TokenizeDirective() {
            var tokens = new List<Token?>();
            while (!IsEndBlock()) {
                var t = Take();
                if (t.Kind == SyntaxKind.EndKeywordToken) {
                    var newToken = new Token(t.Value, SyntaxKind.IdentifierToken, t);
                    tokens.Add(newToken);
                }else {
                    tokens.Add(t); 
                }
            }

            tokens.Add(Token.EndBlock);

            return new TokenGroup(ContextType.DirectiveDeclaration, tokens);
        }
    }
}
