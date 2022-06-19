namespace ZDragon.Compiler;

public record Error
{
    public readonly ISourceSegment SourceSegment;
    public readonly ErrorType ErrorType;
    public readonly string Message;

    public Error(ISourceSegment sourceSegment, ErrorType errorType, string message)
    {
        SourceSegment = sourceSegment;
        ErrorType = errorType;
        Message = message;
    }
}

public enum ErrorType
{
    Unknown,
    InvalidIdentifier,
    UnknownCharacter
}

