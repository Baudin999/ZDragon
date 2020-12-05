using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        public ExpressionNode ParseRecordDefinition() {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);


            var recordDeclaration = Take(SyntaxKind.RecordDeclarationToken);
            var id = Take(SyntaxKind.IdentifierToken);

            // generic parameters
            var genericParameters = TakeWhile(SyntaxKind.GenericParameterToken).ToList();

            // extensions
            List<Token> extensions = new List<Token>();
            if (Current?.Kind == SyntaxKind.ExtendsToken) {
                var extends = Take(SyntaxKind.ExtendsToken);
                extensions = TakeWhile(SyntaxKind.IdentifierToken).ToList();
            }

            // = tokens
            var equals = Take(SyntaxKind.EqualsToken);
            var fields = new List<RecordFieldNode>();
            if (equals != null) {
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

                    TakeWhile(SyntaxKind.AnnotationToken).ToList();
                    var restrictions = new List<RestrictionNode>();
                    while (Current?.Kind == SyntaxKind.AndToken) {
                        Take();
                        var key = Take(SyntaxKind.IdentifierToken);
                        var value = Take();
                        restrictions.Add(new RestrictionNode(key, value));
                        TakeWhile(SyntaxKind.AnnotationToken).ToList();
                    }

                    Take(SyntaxKind.SemiColonToken);

                    fields.Add(new RecordFieldNode(annotation, fieldId, fieldType, restrictions));
                }
            }


            return new RecordNode(annotationNode, id, genericParameters, extensions, fields);
        }
    }
}
