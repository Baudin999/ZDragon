using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;

namespace Compiler.Language {
    public partial class Parser {
        public ExpressionNode ParseAliasDefinition() {
            var type = Take(SyntaxKind.TypeDefinitionToken);
            var id = Take(SyntaxKind.IdentifierToken, AliasMessages[AliasErrors.InvalidIdentifier]);
            var genericParameters = TakeWhile(SyntaxKind.GenericParameterToken);
            var typeDef = Take(SyntaxKind.TypeDefToken, AliasMessages[AliasErrors.AssignmentExpected]);
            var idAlias = ParseExpression();

            var endStatement = Take(SyntaxKind.SemiColonToken);
            return new TypeAliasNode(Token.Range(type, endStatement), id, genericParameters, idAlias);
        }

        //private ExpressionNode FoldExpression(ExpressionNode node) {
        //    if (node is BinaryOperatorNode bNode) {
        //        var left = FoldExpression(bNode.Left);
        //        var right = FoldExpression(bNode.Right);
        //        return new FunctionParameterNode(left).Add(right);

        //    }
        //    else if (node is IdentifierNode idNode) {
        //        return new ParameterNode(idNode);
        //    }
        //    //else {
        //    throw new System.Exception("Invalid Expression");
        //    //}
        //}

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
