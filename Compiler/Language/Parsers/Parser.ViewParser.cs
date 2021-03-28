using Compiler.Language.Nodes;
using Compiler.Symbols;
using System;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {
        public ExpressionNode? ParseView() {

            try {
                // handle the annotations
                var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
                var annotationNode =
                    annotations.Count > 0 ?
                    new AnnotationNode(annotations) :
                    new AnnotationNode(Current ?? SourceSegment.Empty);

                var viewDeclaration = TakeF(SyntaxKind.ViewDeclarationToken);
                
                // Id's of a view can be null, this is because we do not want to force everyone
                // to have to name a view.
                var id = TryTake(SyntaxKind.IdentifierToken);

                // The Equals Sign is required, without a definition the view is worthless.
                var equals = TakeF(SyntaxKind.EqualsToken, ErrorType.View_MissingEquals, @$"
Failed to parse view {id?.Value ?? ""}:

A view definition needs an implementation like:
view Foo =
    Bar

We seem to have detected a missing '=' sign after '{id?.Value ?? "view"}'");

                // Correct a null identifier vor the view by generating a unique 
                // name for the view.
                if (id is null) {
                    id = new Token(Guid.NewGuid().ToString(), SyntaxKind.IdentifierToken, viewDeclaration);
                }

                // Nodes are required, but the length of the nodes will be checked in the type
                // checker, not the parser.
                var nodes = TakeWhile(SyntaxKind.IdentifierToken).OfType<Token>().ToList();

                return new ViewNode(annotationNode, id, nodes);
            }
            catch (Exception) {
                return null;
            }
        }
    }
}
