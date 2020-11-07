using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Language {
    public partial class Parser {

        public ExpressionNode ParseExpression() {

            var left = ParseAtom();

            if (Current?.kind == SyntaxKind.NextParameterToken) {
                var tokens = new List<ExpressionNode>() { left };
                while (Current?.kind == SyntaxKind.NextParameterToken) {
                    Take(SyntaxKind.NextParameterToken);
                    tokens.Add(ParseAtom());
                }
                return new FunctionParameterNode(tokens);
            }
            

            return left;
        }

       


    }
}
