namespace Compiler.Symbols {
    public interface ISourceSegment {
        int ColumnEnd { get; }
        int ColumnStart { get; }
        int IndexEnd { get; }
        int IndexStart { get; }
        int LineStart { get; }
        int LineEnd { get;  }
    }

    public class SourceSegment : ISourceSegment {
        public int ColumnEnd { get; set; }

        public int ColumnStart { get; set; }

        public int IndexEnd { get; set; }

        public int IndexStart { get; set; }

        public int LineStart { get; set; }

        public int LineEnd { get; set; }
    }
}