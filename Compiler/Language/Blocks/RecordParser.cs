using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        public ExpressionNode ParseRecordDefinition() {
            AnnotationNode? recordAnnotation = null;
            TakeBefore(n => n.Kind == SyntaxKind.AnnotationToken)
                .ToList()
                .ForEach(a => {
                    if (recordAnnotation == null) recordAnnotation = new AnnotationNode(a);
                    else recordAnnotation.Add(a);
                });
            var recordDeclaration = Take(SyntaxKind.RecordDeclarationToken);
            var id = Take(SyntaxKind.IdentifierToken);
            var genericParameters = TakeWhile(SyntaxKind.GenericParameterToken).ToList();

            // extensions
            List<Token> extensions = new List<Token>();
            if (Current?.Kind == SyntaxKind.ExtendsToken) {
                var extends = Take(SyntaxKind.ExtendsToken);
                extensions = TakeWhile(SyntaxKind.IdentifierToken).ToList();
            }

            var equals = Take(SyntaxKind.EqualsToken);

            var fields = new List<RecordFieldNode>();
            while (Current != null && Current.Kind != SyntaxKind.EndBlock) {
                               
                AnnotationNode? annotation = null;
                while (Current.Kind == SyntaxKind.AnnotationToken) {
                    if (annotation == null) annotation = new AnnotationNode(Take());
                    else annotation.Add(Take());
                }

                var fieldId = Take(SyntaxKind.IdentifierToken);
                Take(SyntaxKind.ColonToken);
                var fieldType = new List<Token>();
                while (Current?.Kind == SyntaxKind.IdentifierToken || Current?.Kind == SyntaxKind.GenericParameterToken) {
                    fieldType.Add(Take());
                }
                Take(SyntaxKind.SemiColonToken);

                fields.Add(new RecordFieldNode(annotation, fieldId, fieldType));
            }


            return new RecordNode(recordAnnotation, id, genericParameters, extensions, fields);
        }
    }
}
