using Compiler.Symbols;

namespace Compiler {
    public class Warning {
        public string Message { get; }
        public ISourceSegment SourceSegment { get; }
        public WarningType WarningType { get; } = WarningType.Default;


        public Warning(string message) {
            this.Message = message;
            this.SourceSegment = Token.DefaultSourceSegment();
        }

        public Warning(string message, ISourceSegment sourceSegment) {
            this.Message = message;
            this.SourceSegment = sourceSegment;
        }

        public Warning(WarningType errorType, string message, ISourceSegment sourceSegment) {
            this.WarningType = errorType;
            this.Message = message;
            this.SourceSegment = sourceSegment;
        }

        public override string ToString() {
            return this.Message;
        }
    }

    public enum WarningType {
        Default
    }
}
