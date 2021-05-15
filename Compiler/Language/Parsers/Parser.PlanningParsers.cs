using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        internal ExpressionNode ParseRoadmap() {

            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);

            var start = TakeF(SyntaxKind.RoadmapDeclarationToken);
            var name = TakeF();
            if (name.Kind != SyntaxKind.IdentifierToken) {
                ErrorSink.AddError(new Error(ErrorKind.InvalidIdentifier, "Invalid Identifier", name));
            }
            Token end = name;


            // extensions
            List<Token> extensions = new List<Token>();
            if (Current?.Kind == SyntaxKind.ExtendsToken) {
                var extends = Take(SyntaxKind.ExtendsToken);

                extensions = TakeWhile(SyntaxKind.IdentifierToken).OfType<Token>().ToList();
            }



            var attributes = new List<AttributeNode>();
            if (Current?.Kind == SyntaxKind.EqualsToken) {
                _ = Take(SyntaxKind.EqualsToken);

                while (Current?.Kind == SyntaxKind.AttributeFieldStarted) {
                    TakeF(); // attribute field started

                    var fieldName = TakeF();
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

                    end = Take() ?? end; // attribute field ended
                }
            }

            return new RoadmapNode(Token.Range(start, end), annotationNode, name, extensions, attributes);
        }

        internal ExpressionNode ParseMilestone() {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);

            var start = TakeF(SyntaxKind.MilestoneDeclarationToken);
            var name = TakeF();
            if (name.Kind != SyntaxKind.IdentifierToken) {
                ErrorSink.AddError(new Error(ErrorKind.InvalidIdentifier, "Invalid Identifier", name));
            }
            Token end = name;

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
                    _ = Take(); // attribute field started

                    var fieldName = TakeF();
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

                    end = Take() ?? end; // attribute field ended
                }
            }

            return new MilestoneNode(Token.Range(start, end), annotationNode, name, extensions, attributes);
        }

        internal ExpressionNode ParseTask() {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);

            var start = TakeF(SyntaxKind.TaskDeclarationToken);
            var name = TakeF();
            if (name.Kind != SyntaxKind.IdentifierToken) {
                ErrorSink.AddError(new Error(ErrorKind.InvalidIdentifier, "Invalid Identifier", name));
            }
            Token end = name;

            // extensions
            List<Token> extensions = new List<Token>();
            if (Current?.Kind == SyntaxKind.ExtendsToken) {
                var extends = Take(SyntaxKind.ExtendsToken);

                extensions = TakeWhile(SyntaxKind.IdentifierToken).OfType<Token>().ToList();
            }



            var attributes = new List<AttributeNode>();
            if (Current?.Kind == SyntaxKind.EqualsToken) {
                TakeF(SyntaxKind.EqualsToken);

                while (Current?.Kind == SyntaxKind.AttributeFieldStarted) {
                    _ = Take(); // attribute field started

                    var fieldName = TakeF();
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

                    end = Take() ?? end; // attribute field ended
                }
            }

            return new TaskNode(Token.Range(start, end), annotationNode, name, extensions, attributes);
        }
    }
}
