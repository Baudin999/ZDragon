using ZDragon.Compiler.Nodes;
using ZDragon.Compiler.Parsers;

namespace ZDragon.Compiler;

public class Parser
{
    private readonly List<Token> _tokens;
    private readonly int _max;
    private int _index;
    private readonly ErrorSink _errorSink;

    internal Token? Current => _index < _max ? _tokens[_index] : null;
    
    internal Token? At(int i = 0) => _index + i > -1 && _index + i < _max ? _tokens[_index + i] : null;
    internal Token? Previous => At(-1);
    
    internal Token? Take() {
        var result = Current;
        _index += 1;
        return result;
    }
    
    internal Token? Take(TokenType tokenType)
    {

        // skip the whitespace tokens when we're looking
        // for a specific token type.
        while (Current == TokenType.WhiteSpace) Take();
        
        var result = Current;
        if (result != tokenType && result is not null)
        {
            _errorSink.AddError(result, ErrorType.InvalidIdentifier,
                $"Expected an {tokenType} but received a '{Current?.TokenType ?? TokenType.Unknown}'.");
        }

        if (result is null)
        {
            _errorSink.AddError(Token.Default, ErrorType.InvalidIdentifier,
                $"Expected an {tokenType} but received a null.");
        }
        
        _index += 1;
        return result;
    }
    
    public Parser(IEnumerable<Token> tokens, ErrorSink errorSink)
    {
        this._tokens = tokens.ToList();
        this._max = _tokens.Count;
        this._index = 0;
        this._errorSink = errorSink;
    }

    public IEnumerable<IAstNode> Parse()
    {
        while (Current is not null)
        {
            switch (Current.TokenType)
            {
                case TokenType.KwRecord:
                    var recordNode = new RecordParser(this).Parse();
                    if (recordNode is not null)
                        yield return recordNode; 
                    break;
                case TokenType.KwComponent:
                    var componentNode = new ComponentParser(this).Parse();
                    if (componentNode is not null)
                        yield return componentNode;
                    break;
                default:
                    Take();
                    break;
            }
        }
    }
}