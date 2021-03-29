using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser
    {
        public DirectiveNode? ParseDirective()
        {
            var openDirective = Take(SyntaxKind.PercentageToken);
            TakeWhile(SyntaxKind.WhiteSpaceToken);
            var id = Take(SyntaxKind.IdentifierToken);
            if (id is null) {
                ErrorSink.AddError(new Error(ErrorKind.InvalidIdentifier, @$"
Directives should have an identifier:

% id: value
", openDirective ?? Token.DefaultSourceSegment()));

                TakeWhile(t => t.Kind == SyntaxKind.EndBlock || t.Kind == SyntaxKind.SemiColonToken);
                return null;
            }
            
            TakeWhile(SyntaxKind.WhiteSpaceToken);
            if (Current?.Kind == SyntaxKind.ColonToken) {
                Take(SyntaxKind.ColonToken);
                var value = TakeWhile(t => t.Kind != SyntaxKind.EndDirective);
                return new DirectiveNode(id, value);
            }
            else {
                return new DirectiveNode(id, new List<Token> { new Token("true", SyntaxKind.WordToken, id) });
            }

        }
    }
}
