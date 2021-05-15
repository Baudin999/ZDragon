using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        internal ExpressionNode ParseRequirement() {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);

            var start = TakeF(SyntaxKind.RequirementDeclarationToken);
            var name = Take();
            if (name?.Kind != SyntaxKind.IdentifierToken || name is null) {
                ErrorSink.AddError(new Error(ErrorKind.InvalidIdentifier, "Invalid Identifier", name ?? start));
            }

            if (name is null) name = new Token();

            Token end = name;

            // extensions
            List<Token> extensions = new List<Token>();
            if (Current?.Kind == SyntaxKind.ExtendsToken) {
                var extends = Take(SyntaxKind.ExtendsToken);

                extensions = TakeWhile(SyntaxKind.IdentifierToken).OfType<Token>().ToList();
            }



            var attributes = new List<AttributeNode>();
            if (Current?.Kind == SyntaxKind.EqualsToken) {
                _ = TakeF(SyntaxKind.EqualsToken);

                while (Current?.Kind == SyntaxKind.AttributeFieldStarted) {
                    var startField = TakeF(); // attribute field started

                    var fieldName = TakeF(SyntaxKind.IdentifierToken);
                    TakeF(SyntaxKind.ColonToken);
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

                    end = TakeF(); // attribute field ended
                }
            }

            
            return new RequirementNode(Token.Range(start, end ?? Token.DefaultSourceSegment()), annotationNode, name, extensions, attributes);
        }
    }
}
