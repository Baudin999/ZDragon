using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        internal ExpressionNode ParseGuideline() {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);


            var start = TakeF(SyntaxKind.GuidelineDeclarationToken);
            var name = Take();
            if (name?.Kind != SyntaxKind.IdentifierToken) {
                ErrorSink.AddError(new Error(ErrorKind.InvalidIdentifier, "Invalid Identifier", start));
            }
            Token end = name ?? start;

            // extensions
            List<Token> extensions = new List<Token>();
            if (Current?.Kind == SyntaxKind.ExtendsToken) {
                var extends = Take(SyntaxKind.ExtendsToken);

                extensions = TakeWhile(SyntaxKind.IdentifierToken).OfType<Token>().ToList();
            }



            var attributes = new List<AttributeNode>();
            if (Current?.Kind == SyntaxKind.EqualsToken) {
                Take(SyntaxKind.EqualsToken);

                while (Current?.Kind == SyntaxKind.AttributeFieldStarted) {
                    Take(); // attribute field started

                    var fieldName = TakeF();
                    _ = TakeF(SyntaxKind.ColonToken);
                    var fieldDescription = 
                            TakeWhile(t => t.Kind != SyntaxKind.AttributeFieldEnded)
                                .OfType<Token>()
                                .ToList();

                    List<List<Token>> items = new List<List<Token>>();
                    if (fieldDescription.FirstOrDefault()?.Kind == SyntaxKind.MinusToken ||
                        (fieldDescription.Count > 1 && fieldDescription[1]?.Kind == SyntaxKind.MinusToken)) {
                        // we now assume taht we're in a list definition

                        List<Token>? currentItem = null;
                        foreach (var item in fieldDescription) {
                            if (item.Kind == SyntaxKind.MinusToken) {
                                if (currentItem != null) items.Add(currentItem);
                                currentItem = new List<Token>();
                            }
                            else {
                                if (currentItem != null) currentItem.Add(item);
                            }
                        }
                        if (currentItem != null) items.Add(currentItem);
                    }

                    attributes.Add(new AttributeNode(fieldName, fieldDescription, items));

                    end = Take() ?? end; // attribute field ended
                }
            }

            return new GuidelineNode(Token.Range(start, end), annotationNode, name ?? start, extensions, attributes);
        }
    }
}
