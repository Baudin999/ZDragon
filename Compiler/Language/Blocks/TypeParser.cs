using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language {
    public partial class Parser {

        public ExpressionNode ParseTypeDefinition() {



            var typeDeclaration = Take(SyntaxKind.TypeDeclarationToken);
            var id = Take(SyntaxKind.IdentifierToken);
            var genericParameters = TakeWhile(SyntaxKind.GenericParameterToken);

            // extensions
            IEnumerable<Token> extensions;
            if (Current.kind == SyntaxKind.ExtendsToken) {
                var extends = Take(SyntaxKind.ExtendsToken);
                extensions = TakeWhile(SyntaxKind.IdentifierToken);
            }



            return null;
        }
    }
}
