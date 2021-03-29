using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public partial class Parser {

        internal ExpressionNode ParseEndPoint() {
            var start = Take(SyntaxKind.EndPointDeclarationToken);
            var name = Take();
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


            ExpressionNode? expression = null;
            if (Current?.Kind == SyntaxKind.ColonToken && Next?.Kind == SyntaxKind.ColonToken) {
                Take(); // first colon
                Take(); // second colon

                expression = ParseExpression();
            }

            var attributes = new List<AttributeNode>();
            if (Current?.Kind == SyntaxKind.EqualsToken) {
                Take(SyntaxKind.EqualsToken);

                while (Current?.Kind == SyntaxKind.AttributeFieldStarted) {
                    Take(); // attribute field started

                    var fieldName = Take();
                    Take(SyntaxKind.ColonToken);
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

                    end = Take(); // attribute field ended
                }
            }

            return new EndpointNode(Token.Range(start, end), name, extensions, attributes, expression);
        }
    }
}
