using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
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


            var openDeclaration = TakeF(SyntaxKind.OpenDeclarationToken);
            var id = TakeF(SyntaxKind.IdentifierToken);

            Token end = id;
            if (Current?.Kind == SyntaxKind.SemiColonToken)
                end = TakeF(SyntaxKind.SemiColonToken);
            if (Current?.Kind == SyntaxKind.EndBlock)
                end = TakeF(SyntaxKind.EndBlock);


            var fullToken = new Token(new List<Token> { openDeclaration, end }, SyntaxKind.None);

            return new OpenNode(annotationNode, id, fullToken);
        }

    }
}
