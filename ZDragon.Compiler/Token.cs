namespace ZDragon.Compiler;


public sealed record Token : ISourceSegment, IEquatable<TokenType>, IEquatable<string>
{
    public int LineStart { get; }
    public int LineEnd { get; }
    public int WordStart { get; }
    public int WordEnd { get; }
    public TokenType TokenType { get; private set; }
    public string Text { get; }

    public Token(int lineStart, int lineEnd, int wordStart, int wordEnd, TokenType tokenType, string text)
    {
        LineStart = lineStart;
        LineEnd = lineEnd;
        WordStart = wordStart;
        WordEnd = wordEnd;
        TokenType = tokenType;
        Text = text;
    }

    public Token Append(char character)
    {
        return new Token(LineStart, LineEnd, WordStart, WordEnd + 1, TokenType,Text + character);
    }

    public override string ToString()
    {
        return $"{TokenType} - '{Text}'";
    }

    public void ChangeType(TokenType newTokenType)
    {
        TokenType = newTokenType;
    }
    
    // OVERLOAD EQUALITY COMPARISONS
    
    public static bool operator ==(Token? token, TokenType tokenType)
    {
        return token?.Equals(tokenType) ?? false;
    }
    public static bool operator !=(Token? token, TokenType tokenType)
    {
        return !token?.Equals(tokenType) ?? true;
    }
    
    public static bool operator ==(Token? token, string value)
    {
        return token?.Equals(value) ?? false;
    }
    public static bool operator !=(Token? token, string value)
    {
        return !token?.Equals(value) ?? true;
    }

    public bool Equals(TokenType tokenType)
    {
        return TokenType == tokenType;
    }
    public bool Equals(string? value)
    {
        return Text == value;
    }

    
}

public enum TokenType
{
    Default,
    NewLine,
    Indent,
    Identifier,
    Colon,
    SemiColon,
    Equals,
    Number,
    KwRecord,
    KwType,
    KwChoice,
    KwData,
    KwComponent,
    KwSystem,
    KwFlow,
    KwView,
    KwExtends,
    Word,
    GreaterThen,
    LessThen,
    Dot,
    Comma,
    Exclamation,
    At,
    Hash,
    Dollar,
    Star,
    ParanOpen,
    ParanClose,
    BracketOpen,
    BracketClose,
    Plus,
    Minus,
    Character,
    WhiteSpace,
    AnnotationLine,
    Chapter,
    BeginContext,
    EndContext
}