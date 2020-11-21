using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {
        public ExpressionNode ParseTypeDefinition() {
            var type = Take(SyntaxKind.TypeDefinitionToken);
            var id = Take(SyntaxKind.IdentifierToken, AliasMessages[AliasErrors.InvalidIdentifier]);
            var genericParameters = TakeWhile(SyntaxKind.GenericParameterToken).ToList();
            var typeDef = Take(SyntaxKind.EqualsToken, AliasMessages[AliasErrors.AssignmentExpected]);
            var idAlias = ParseExpression();

            var endStatement = Take(SyntaxKind.SemiColonToken);
            return new TypeAliasNode(Token.Range(type, endStatement), id, genericParameters, idAlias);
        }

        private enum AliasErrors {
            InvalidIdentifier,
            AssignmentExpected
        }

        private readonly Dictionary<AliasErrors, string> AliasMessages = new Dictionary<AliasErrors, string> {
            { AliasErrors.InvalidIdentifier, @"
An alias expects an Identifer as a name of the alias, for example:

alias name = string;
" }, 
            { AliasErrors.AssignmentExpected, @"
An alias expects an equals sign when reanming a type, we seem
to miss the equals sign in your code, for example:

alias name = string;
"}
        };
    }
}
