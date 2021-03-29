using Compiler.Symbols;

namespace Compiler {
    public class Error {
        public string Message { get; set;  }
        public ISourceSegment SourceSegment { get; set; }
        public ErrorKind ErrorType { get; set;  } = ErrorKind.GenericError;


        public Error(string message) {
            this.Message = message;
            this.SourceSegment = Token.DefaultSourceSegment();
        }

        public Error(string message, ISourceSegment sourceSegment) {
            this.Message = message;
            this.SourceSegment = sourceSegment;
        }

        public Error(ErrorKind errorKind, string message, ISourceSegment sourceSegment) {
            this.ErrorType = errorKind;
            this.Message = message;
            this.SourceSegment = sourceSegment;
        }

        public override string ToString() {
            return this.Message;
        }
    }

    public enum ErrorKind {
        GenericParameter,

        GenericError,
        GenericParameter_Unused,
        GenericParameter_Undefined,
        InvalidIdentifier,
        Unknown,
        InvalidTypeDefinition,
        Generics_ApplicationMisMatch,

        // records 
        Record_UnknownFieldType,
        Record_InvalidFieldIdentifier,

        // architecture
        Architecture_Interaction_MissingFrom,
        Architecture_Interaction_MissingTo,

        // view errors
        View_MissingFields,
        View_MissingEquals,
        View_UnknownField,
        View_WrongFieldType
    }
}
