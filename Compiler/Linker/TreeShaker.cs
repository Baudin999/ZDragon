using Compiler.Language.Nodes;
using System.Collections.Generic;

namespace Compiler.Linker {
    public class TreeShaker {
        public ErrorSink ErrorSink { get; }
        public IEnumerable<AstNode> Ast { get; }

        public TreeShaker(ErrorSink es, IEnumerable<AstNode> ast) {
            this.ErrorSink = es;
            this.Ast = ast;
        }

    }
}
