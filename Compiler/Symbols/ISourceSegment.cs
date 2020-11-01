namespace Compiler.Symbols {
    public interface ISourceSegment {
        int columnEnd { get; }
        int columnStart { get; }
        int indexEnd { get; }
        int indexStart { get; }
        int lineStart { get; }
        int lineEnd { get;  }
    }

    public class SourceSegment : ISourceSegment {
        public int columnEnd { get; set; }

        public int columnStart { get; set; }

        public int indexEnd { get; set; }

        public int indexStart { get; set; }

        public int lineStart { get; set; }

        public int lineEnd { get; set; }
    }
}