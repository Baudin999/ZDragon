using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {
        public ExpressionNode ParseView() {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);

            var viewDeclaration = Take(SyntaxKind.ViewDeclarationToken);
            var id = Take(SyntaxKind.IdentifierToken);
            var equals = Take(SyntaxKind.EqualsToken);
            var nodes = TakeWhile(SyntaxKind.IdentifierToken).OfType<Token>().ToList();

            return new ViewNode(annotationNode, id, nodes);
        }
    }
}
