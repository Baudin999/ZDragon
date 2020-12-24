using Compiler.Language.Nodes;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Linking {
    public class Linker {
        private readonly List<AstNode> ast;
        private readonly List<OpenNode> openStatements;

        public Linker(List<AstNode> ast) {
            this.ast = ast;
            this.openStatements = ast.OfType<OpenNode>().ToList();
        }

        internal List<CompilationResult> TraverseLinks() {
            return 
                this.openStatements
                    .Select(o => CompilationCache.Get(o.Id))
                    .OfType<CompilationResult>()
                    .ToList();
        }
    }
}
