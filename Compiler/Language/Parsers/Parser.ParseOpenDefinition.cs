using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser
    {

        public ExpressionNode ParseOpenDefinition()
        {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);


            var openDeclaration = Take(SyntaxKind.OpenDeclarationToken);
            var id = Take(SyntaxKind.IdentifierToken);

            var end = Take(SyntaxKind.EndBlock);

            return new OpenNode(annotationNode, id);
        }
    }
}
