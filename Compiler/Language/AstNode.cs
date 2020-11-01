using Compiler.Symbols;
using System;
using System.Collections.Generic;
using System.Text;

namespace Compiler.Language {
    public class AstNode {
        public ISourceSegment Segment { get; }
        public AstNode(ISourceSegment segment) {
            this.Segment = segment;
        }

    }
}
