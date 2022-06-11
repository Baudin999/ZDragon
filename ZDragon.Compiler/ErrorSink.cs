namespace ZDragon.Compiler;


public class ErrorSink
{
    public List<Error> Errors { get; private set; }
    public ErrorSink()
    {
        Errors = new List<Error>();
    }

    public ErrorSink AddError(Token token, ErrorType type, string message)
    {
        Errors.Add(new Error(token, type, message));
        return this;
    }
}