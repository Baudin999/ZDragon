using Compiler.Language.Nodes;
using Compiler.Symbols;
using System;
using System.Collections.Generic;
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
                var equals = TakeF(SyntaxKind.EqualsToken, ErrorKind.View_MissingEquals, @$"
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

                List<ViewNodeItem> items = new List<ViewNodeItem>();

                // Nodes are required, but the length of the nodes will be checked in the type
                // checker, not the parser.
                while (Current?.Kind == SyntaxKind.IdentifierToken) {
                    var itemId = TakeF();   // ID

                    List<AttributeNode> attributes = new List<AttributeNode>();
                    while (Current?.Kind == SyntaxKind.AttributeFieldStarted) {
                        _ = TakeF();

                        var key = TakeF();
                        var colon = TakeF();
                        var values = TakeWhile(t => t.Kind != SyntaxKind.AttributeFieldEnded).ToList();
                        var new_values = new List<Token>();
                        foreach (var v in values) {
                            new_values.Add(v);
                            new_values.Add(new Token(" ", SyntaxKind.WhiteSpaceToken, v));
                        }
                        attributes.Add(new AttributeNode(key, new_values, new List<List<Token>>()));
                        if (Current?.Kind == SyntaxKind.AttributeFieldEnded) _ = TakeF();
                    }
                    items.Add(new ViewNodeItem(itemId, attributes));
                }

                return new ViewNode(annotationNode, id, items);
            }
            catch (Exception ex) {
                return null;
            }
        }
    }
}
