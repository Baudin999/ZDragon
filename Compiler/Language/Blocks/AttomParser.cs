using Compiler.Language.Nodes;

namespace Compiler.Language {
    public partial class Parser {

        private ExpressionNode ParseAtom() {
            if (Current is null) {
                throw new System.Exception("Can't parse a null token");
            }
            else {
                return new ExpressionNode(Take());
            }
            
        }

    }
}
