using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language
{
    public partial class Parser
    {

        public ExpressionNode ParseChoiceDefinition()
        {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);


            var choiceDeclaration = Take(SyntaxKind.ChoiceDeclarationToken);
            var id = Take(SyntaxKind.IdentifierToken);
            var equals = Take(SyntaxKind.EqualsToken);

            var fields = new List<ChoiceFieldNode>();
            while (Current != null && Current.Kind != SyntaxKind.EndBlock)
            {

                AnnotationNode? annotation = null;
                while (Current.Kind == SyntaxKind.AnnotationToken)
                {
                    if (annotation == null) annotation = new AnnotationNode(TakeF());
                    else annotation.Add(TakeF());
                }

                // take the pipe token
                // | "Female"
                Take(SyntaxKind.PipeToken);


                // choices can be either of type String or Number
                var value = Take();
                if (value is not null && value.Kind != SyntaxKind.StringLiteralToken && value.Kind != SyntaxKind.NumberLiteralToken)
                {
                    // error
                    ErrorSink.AddError(new Error(
                        message: $"Expected either a String or a Number but found a {value.Kind}",
                        sourceSegment: value
                    ));
                }

                fields.Add(new ChoiceFieldNode(annotation, value));
            }


            return new ChoiceNode(annotationNode, id, fields);
        }
    }
}
