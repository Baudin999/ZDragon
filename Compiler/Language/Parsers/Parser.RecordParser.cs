using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        public ExpressionNode? ParseRecordDefinition() {
            // handle the annotations
            var annotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
            var annotationNode =
                annotations.Count > 0 ?
                new AnnotationNode(annotations) :
                new AnnotationNode(Current ?? SourceSegment.Empty);


            var recordDeclaration = Take(SyntaxKind.RecordDeclarationToken);
            var id = TryTake(SyntaxKind.IdentifierToken);
            if (id?.Kind != SyntaxKind.IdentifierToken) {
                ErrorSink.AddError(new Error(ErrorKind.InvalidIdentifier, "Invalid Identifier", id ?? Current ?? Token.DefaultSourceSegment()));
                _ = TakeWhile(t => t != null).ToList();
                return null;
            }
            else if (char.IsLower(id.Value[0])) {
                ErrorSink.AddError(new Error(ErrorKind.InvalidIdentifier, "Invalid Identifier, Identifiers should start with a capital letter.", id));
            }

            // generic parameters
            var genericParameters = TakeWhile(SyntaxKind.GenericParameterToken).OfType<Token>().ToList();

            // extensions
            List<Token> extensions = new List<Token>();
            if (Current?.Kind == SyntaxKind.ExtendsToken) {
                var extends = Take(SyntaxKind.ExtendsToken);
                extensions = TakeWhile(SyntaxKind.IdentifierToken).OfType<Token>().ToList();
            }

            if (Current?.Kind == SyntaxKind.SemiColonToken || Current?.Kind == SyntaxKind.EndBlock) {
                TakeWhile(t => t.Kind == SyntaxKind.SemiColonToken || t.Kind == SyntaxKind.EndBlock);
                return new RecordNode(annotationNode, id, genericParameters, extensions, new List<RecordFieldNode>());
            }

            // '=' token
            var equals = Take(SyntaxKind.EqualsToken);
            var fields = new List<RecordFieldNode>();
            if (equals != null) {

                // parse record fields
                while (Current != null && Current.Kind != SyntaxKind.EndBlock) {

                    AnnotationNode? annotation = null;
                    var directives = new List<DirectiveNode>();

                    while (Current.Kind == SyntaxKind.AnnotationToken || Current.Kind == SyntaxKind.PercentageToken) {
                        if (Current.Kind == SyntaxKind.AnnotationToken) {
                            if (annotation == null) annotation = new AnnotationNode(TakeF());
                            else annotation.Add(TakeF());
                        }
                        else if (Current.Kind == SyntaxKind.PercentageToken) {
                            var directive = ParseDirective();
                            if (directive != null) directives.Add(directive);
                            TakeF(SyntaxKind.EndDirective);
                        }
                    }

                    var fieldId = Take(SyntaxKind.IdentifierToken);
                    if (fieldId == null) {
                        ErrorSink.AddError(new Error(ErrorKind.Record_InvalidFieldIdentifier, @"Invalid Field Identifier:
record Person =
    FirstName: String;
", Current ?? id));

                        _ = TakeWhile(t => t.Kind != SyntaxKind.SemiColonToken).ToList();
                    }
                    else {

                        _ = Take(SyntaxKind.ColonToken);
                        var fieldType = new List<Token>();
                        while (Current?.Kind == SyntaxKind.IdentifierToken || Current?.Kind == SyntaxKind.GenericParameterToken) {
                            fieldType.Add(TakeF());
                        }

                        var restrictionAnnotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
                        var restrictions = new List<RestrictionNode>();
                        while (Current?.Kind == SyntaxKind.AndToken) {
                            _ = TakeF(SyntaxKind.AndToken);
                            var key = TakeF(SyntaxKind.IdentifierToken);
                            var value = TakeF();
                            restrictions.Add(new RestrictionNode(key, value));
                            restrictionAnnotations = TakeWhile(SyntaxKind.AnnotationToken).ToList();
                        }
                        fields.Add(new RecordFieldNode(annotation, directives, fieldId, fieldType, restrictions));
                    }
                    _ = TryTake(SyntaxKind.SemiColonToken);
                }
            }


            return new RecordNode(annotationNode, id, genericParameters, extensions, fields);
        }
    }
}
