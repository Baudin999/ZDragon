using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {
        public ExpressionNode? ParseTypeDefinition() {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode = 
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);

            // parse the rest of the type definition
            var type = TakeF(SyntaxKind.TypeDeclarationToken);
            var id = Take(SyntaxKind.IdentifierToken, AliasMessages[AliasErrors.InvalidIdentifier]);
            if (id is null) {
                TakeWhile(t => t.Kind == SyntaxKind.EndBlock || t.Kind == SyntaxKind.SemiColonToken);
                return null;
            }

            var genericParameters = TakeWhile(SyntaxKind.GenericParameterToken).OfType<Token>().ToList();
            var typeDef = Take(SyntaxKind.EqualsToken, AliasMessages[AliasErrors.AssignmentExpected]);
            if (typeDef is null) {
                ErrorSink.Errors.Add(new Error(ErrorKind.InvalidTypeDefinition, $"Type aliasses cannot be simple names, the complete type definition is required", id));
                return new TypeAliasNode(Token.Range(type, id), annotationNode, id, genericParameters, new ExpressionNode(id, ExpressionKind.EmptyExpression));
            }

            var idAlias = ParseExpression();

            TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var restrictions = new List<RestrictionNode>();
            while (Current != null && Current.Kind == SyntaxKind.ContextualIndent1 && Next?.Kind == SyntaxKind.AndToken) {
                Take(); // ContextualIndent1
                Take(); // AndToken
                var key = TakeF(SyntaxKind.IdentifierToken);
                var value = TakeF();
                restrictions.Add(new RestrictionNode(key, value));
                TakeWhile(SyntaxKind.AnnotationToken).ToList();
            }

            var endStatement = TryTake(SyntaxKind.SemiColonToken);

            // return the block
            return new TypeAliasNode(Token.Range(type, endStatement ?? idAlias.Segment), annotationNode, id, genericParameters, idAlias);
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
