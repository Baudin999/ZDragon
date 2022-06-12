namespace ZDragon.Compiler;

public class Lexer 
{
    private ErrorSink ErrorSink { get; }
    
    private string _code = "";
    private int _offset = 0;
    private int _line = 0;
    private int _lineIndex = 0;
    private int _max = 0;

    // We are in a context when we 
    private bool _inContext = false;

    private Token? _t = null;
    private readonly List<Token> _result = new();

    private char Current => _offset < _max ? _code[_offset] : char.MaxValue;
    private char At(int index) => (_offset + index) < _max ? _code[_offset + index] : char.MaxValue;
    private Token Previous => _result.Last();


    private Token? _last = null;

    private void _add(Token token)
    {
        _result.Add(token);
        if (token != TokenType.NewLine)
            _last = token;
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

    private void Skip()
    {
        _offset += 1;
        _lineIndex += 1;
    }

    private Token TakeNewLine()
    {
        if (Current == '\n') Take(TokenType.NewLine);
        if (Current == '\r') Take();

        _line += 1;
        _lineIndex = 0;
        
        // this exception cannot happen, because the "take()" function creates a
        // token if it is null, but the compiler complains if I do not add this
        // check.
        if (_t is null) throw new Exception("Token cannot be null");

        return _t;
    }

    private Token TakeTabOrWhitespace()
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

        // this exception cannot happen, because the "take()" function creates a
        // token if it is null, but the compiler complains if I do not add this
        // check.
        if (_t is null) throw new Exception("Token cannot be null");

        return _t;
    }

    private Token TakeIdentifier()
    {
        // if we are not in a context, just call the token a word and be done with it.
        if (_inContext && Previous != TokenType.NewLine)
        {
            Take(TokenType.Identifier);
        
            while (char.IsLetterOrDigit(Current) || Current == '_')
            {
                Take();
            }    
        }
        else
        {
            Take(TokenType.Word);
        
            while (!_isNewLine())
            {
                Take();
            }
            EndContext();
        }
        
        
        // this exception cannot happen, because the "take()" function creates a
        // token if it is null, but the compiler complains if I do not add this
        // check.
        if (_t is null) throw new Exception("Token cannot be null");

        return _t;
    }

    private Token TakeNumber()
    {
        var foundDot = false;
        // var foundExp = false;
        Take(TokenType.Number);
        while (char.IsDigit(Current) || (!foundDot && Current == '.'))
        {
            if (Current == '.') foundDot = true;
            Take();
        }
        
        // this exception cannot happen, because the "take()" function creates a
        // token if it is null, but the compiler complains if I do not add this
        // check.
        if (_t is null) throw new Exception("Token cannot be null");

        return _t;
    }

    

    private Token TakeKeyword()
    {
        Take();
        while (char.IsLetterOrDigit(Current) || Current == '_')
        {
            Take();
        }
        
        // this exception cannot happen, because the "take()" function creates a
        // token if it is null, but the compiler complains if I do not add this
        // check.
        if (_t is null) throw new Exception("Token cannot be null");

        
        switch (_t.Text)
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
                _t.ChangeType(TokenType.Word);
                // if it is just a word we'll pull everything until the new line.
                while (!_isNewLine()) Take();
                EndContext();
                break;
        }

        if (_t != TokenType.Word)
        {
            if (_last != TokenType.AnnotationLine) 
                EndContext();
            BeginContext();
        }

        return _t;
    }
    
    private void BeginContext()
    {
        if (_inContext) return;
        
        _inContext = true;
        _add(
            new Token(
                _line, 
                _line, 
                _lineIndex, 
                _lineIndex + 1, 
                TokenType.BeginContext, 
                "")
        );
    }
    private void EndContext()
    {
        if (!_inContext) return;
        
        _inContext = false;
        _add(
            new Token(
                _line, 
                _line, 
                _lineIndex, 
                _lineIndex + 1, 
                TokenType.EndContext, 
                "")
        );
    }

    public Lexer(ErrorSink errorSink)
    {
        this.ErrorSink = errorSink;
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
            else if (Current == '!')
            {
                Take(TokenType.Exclamation);
            }
            else if (Current == '@')
            {
                if (Previous == TokenType.NewLine)
                {
                    if (_last != TokenType.AnnotationLine)
                        EndContext();
                    
                    BeginContext();
                    Take(TokenType.AnnotationLine);
                    while (!_isNewLine()) Take();
                }
                else
                {
                    Take(TokenType.At);
                }
            }
            else if (Current == '#')
            {
                if (Previous == TokenType.NewLine)
                {
                    Take(TokenType.Chapter);
                    while (!_isNewLine()) Take();
                    EndContext();
                }
                else
                {
                    Take(TokenType.Hash);
                }
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
            else if (Current == '-')
            {
                Take(TokenType.Minus);
            }
            else if (Current == '+')
            {
                Take(TokenType.Plus);
            }
            else if (_isWhiteSpace())
            {
                if (_inContext) Skip();
                else Take(TokenType.WhiteSpace);
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
                Take(TokenType.Character);
            }
        }
        
        EndContext();

        return _result;
    }

    private bool _isWhiteSpace() => Current == ' ';

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