using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public class AstNode {

        public bool Imported { get; set; } = false;
        public string? ImportedFrom { get; set; }

        public ISourceSegment Segment { get; protected set; }
        public AstNode(ISourceSegment segment) {
            this.Segment = segment;
        }
        public AstNode(ISourceSegment start, ISourceSegment end) {
            this.Segment = Token.Range(start, end);
        }

        public AstNode() { }

        public virtual AstNode Copy() { 
            return this; 
        }
    }
}
