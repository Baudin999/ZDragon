using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        public ExpressionNode ParseDataDefinition() {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);


            var dataDeclaration = Take(SyntaxKind.DataDeclarationToken);
            var id = TakeF(SyntaxKind.IdentifierToken);
            var genericParameters = TakeWhile(SyntaxKind.GenericParameterToken).ToList();

            var equals = Take(SyntaxKind.EqualsToken);

            var fields = new List<DataFieldNode>();

            if (equals is not null) {
                while (Current != null && Current.Kind != SyntaxKind.EndBlock) {

                    AnnotationNode? annotation = null;
                    while (Current?.Kind == SyntaxKind.AnnotationToken) {
                        if (annotation == null) annotation = new AnnotationNode(TakeF());
                        else annotation.Add(TakeF());
                    }

                    // | Some 'a
                    Take(SyntaxKind.PipeToken);

                    var parameters = TakeWhile(t => t.Kind == SyntaxKind.IdentifierToken || t.Kind == SyntaxKind.GenericParameterToken).ToList();
                    fields.Add(new DataFieldNode(annotation, parameters.First(), parameters));
                }
            }


            return new DataNode(annotationNode, id, genericParameters, fields);
        }
    }
}
