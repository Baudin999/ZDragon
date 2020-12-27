using Compiler.Symbols;

namespace Compiler {
    public class Error {
        public string Message { get; }
        public ISourceSegment SourceSegment { get; }


        public Error(string message) {
            this.Message = message;
            this.SourceSegment = Token.DefaultSourceSegment();
        }

        public Error(string message, ISourceSegment sourceSegment) {
            this.Message = message;
            this.SourceSegment = sourceSegment;
        }

        public override string ToString() {
            return this.Message;
        }
    }
}
