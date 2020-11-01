using Compiler.Language.Nodes;

namespace Compiler.Language {
    public partial class Parser {

        public ExpressionNode ParseExpression() {

            var left = ParseAtom();
                     

            return new ExpressionNode(Current);
        }

       


    }
}
