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

        public static ISourceSegment Empty => new SourceSegment {
            ColumnEnd = 0,
            ColumnStart = 0,
            IndexStart = 0,
            IndexEnd = 0,
            LineStart = 0,
            LineEnd = 0
        };
    }
}