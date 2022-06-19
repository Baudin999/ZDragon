namespace ZDragon.Compiler;

public class Lexer 
{
    private ErrorSink ErrorSink { get; }
    public List<Error> Errors => ErrorSink.Errors;
    
    private string _code = "";
    private int _offset = 0;
    private int _line = 0;
    private int _lineIndex = 0;
    private int _max = 0;

    private Token? _t = null;
    private readonly List<Token> _result = new();

    private char Current => _offset < _max ? _code[_offset] : char.MaxValue;

    private char At(int index) => (_offset + index) < _max ? _code[_offset + index] : char.MaxValue;

    private void _add(Token token)
    {
        _result.Add(token);
    }

    private bool IsPattern(string pattern)
    {
        var index = 0;
        while (index < pattern.Length && pattern[index] == At(index))
        {
            index++;
        }

        return index == pattern.Length;
    }

    private Token Take(TokenType tokenType = TokenType.Default)
    {
        if (_t is null)
            _t = new Token(_line, _line, _lineIndex, _lineIndex + 1, tokenType, Current.ToString());
        else
            _t = _t.Append(Current);

        _offset += 1;
        _lineIndex += 1;

        return _t;
    }

    // private void Skip()
    // {
    //     _offset += 1;
    //     _lineIndex += 1;
    // }

    // private Token? TakeLine(bool includeNewLine = true)
    // {
    //     while (!_isNewLine())
    //     {
    //         Take();
    //     }
    //
    //     TakeNewLine();
    //
    //     return _t;
    // }

    private Token? TakeNewLine()
    {
        if (Current == '\n') Take(TokenType.NewLine);
        if (Current == '\r') Take();

        _line += 1;
        _lineIndex = 0;
        
        return _t;
    }

    private Token? TakeTabOrWhitespace()
    {
        if (Current == ' ')
        {
            Take(TokenType.Indent);
            Take();
            Take();
            Take();
        }
        else
        {
            Take();
        }

        return _t;
    }

    private Token? TakeIdentifier()
    {
        Take(TokenType.Identifier);
    
        while (char.IsLetterOrDigit(Current) || Current == '_')
        {
            Take();
        }    
    
        return _t;
    }


    private Token? TakeNumber()
    {
        var foundDot = false;
        // var foundExp = false;
        Take(TokenType.Number);
        while (char.IsDigit(Current) || (!foundDot && Current == '.'))
        {
            if (Current == '.') foundDot = true;
            Take();
        }
        
        return _t;
    }

    

    private Token? TakeKeyword()
    {
        Take();
        while (char.IsLetterOrDigit(Current) || Current == '_')
        {
            Take();
        }

        switch (_t?.Text)
        {
            case "record":
                _t.ChangeType(TokenType.KwRecord);
                break;
            case "data":
                _t.ChangeType(TokenType.KwData);
                break;
            case "type":
                _t.ChangeType(TokenType.KwType);
                break;
            case "choice":
                _t.ChangeType(TokenType.KwChoice);
                break;
            case "component":
                _t.ChangeType(TokenType.KwComponent);
                break;
            case "system":
                _t.ChangeType(TokenType.KwSystem);
                break;
            case "endpoint":
                _t.ChangeType(TokenType.KwEndpoint);
                break;
            case "extends":
                _t.ChangeType(TokenType.KwExtends);
                break;
            case "view":
                _t.ChangeType(TokenType.KwView);
                break;
            case "flow":
                _t.ChangeType(TokenType.KwFlow);
                break;
            default:
                _t?.ChangeType(TokenType.Word);
                break;
        }

        return _t;
    }

    public Lexer(ErrorSink? errorSink = null)
    {
        this.ErrorSink = errorSink ?? new ErrorSink();
    }

    private void YieldCurrent()
    {
        if (_t is null) return;
        _add(_t);
        _t = null;
    }

    public IEnumerable<Token> Lex(string code)
    {
        _code = code;
        _max = code.Length;
        _offset = 0;
        _line = 0;
        _lineIndex = 0;


        for (; _offset < _max;)
        {
            YieldCurrent();

            if (_isTabOrWhitespace())
            {
                // this is a TAB or a whitespace
                TakeTabOrWhitespace();
            }
            else if (Current == ':')
            {
                Take(TokenType.Colon);
            }
            else if (Current == ';')
            {
                Take(TokenType.SemiColon);
            }
            else if (Current == '=')
            {
                Take(TokenType.Equals);
            }
            else if (Current == '>')
            {
                Take(TokenType.GreaterThen);
            }
            else if (Current == '<')
            {
                Take(TokenType.LessThen);
            }
            else if (Current == '.')
            {
                Take(TokenType.Dot);
            }
            else if (Current == ',')
            {
                Take(TokenType.Comma);
            }
            else if (Current == '\'')
            {
                Take(TokenType.Quote);
            }
            else if (Current == '"')
            {
                Take(TokenType.DoubleQuote);
            }
            else if (Current == '!')
            {
                Take(TokenType.Exclamation);
            }
            else if (Current == '@')
            {
                Take(TokenType.At);
            }
            else if (Current == '#')
            {
                Take(TokenType.Hash);
            }
            else if (Current == '$')
            {
                Take(TokenType.Dollar);
            }
            else if (Current == '*')
            {
                Take(TokenType.Star);
            }
            else if (Current == '(')
            {
                Take(TokenType.ParanOpen);
            }
            else if (Current == ')')
            {
                Take(TokenType.ParanClose);
            }
            else if (Current == '[')
            {
                Take(TokenType.BracketOpen);
            }
            else if (Current == ']')
            {
                Take(TokenType.BracketClose);
            }
            else if (Current == '{')
            {
                Take(TokenType.BraceOpen);
            }
            else if (Current == '}')
            {
                Take(TokenType.BraceClose);
            }
            else if (Current == '-')
            {
                Take(TokenType.Minus);
            }
            else if (Current == '+')
            {
                Take(TokenType.Plus);
            }
            else if (Current == '/')
            {
                Take(TokenType.Slash);
            }
            else if (Current == '%')
            {
                Take(TokenType.Percentage);
            }
            else if (Current == '^')
            {
                Take(TokenType.Carret);
            }
            else if (Current == '&')
            {
                Take(TokenType.Ampassant);
            }
            else if (Current == '_')
            {
                Take(TokenType.Underscore);
            }
            else if (Current == '\\')
            {
                Take(TokenType.BackSlash);
            }
            else if (_isWhiteSpace())
            {
                Take(TokenType.WhiteSpace);
            }
            else if (_isNewLine())
            {
                TakeNewLine();
            }
            else if (char.IsUpper(Current))
            {
                TakeIdentifier();
            }
            else if (char.IsLower(Current))
            {
                TakeKeyword();
            }
            else if (char.IsDigit(Current))
            {
                TakeNumber();
            }
            else
            {
                // take the unknown character
                Take();
                this.ErrorSink.AddError(_t ?? Token.Default, ErrorType.UnknownCharacter, $@"Unknown character '{_t?.Text}'.");
                _t = null;
            }
        }
        
        if (_t is not null) YieldCurrent();
        
        return _result;
    }

    private  bool _isWhiteSpace() => Current == ' ';

    private bool _isNewLine()
    {
        if (Current == '\n')
        {
            return At(1) == '\r' || true;
        }

        return false;
    }

    private bool _isTabOrWhitespace() => IsPattern("    ") || Current == '\t';

}



/*
 * This class is the ZDragon lexer, this lexer is used to generate tokens in the 'code'
 * which we write.
*/