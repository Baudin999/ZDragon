using ZDragon.Compiler.Nodes;
using ZDragon.Compiler.Parsers;

namespace ZDragon.Compiler;

public class Parser
{
    private readonly List<Token> _tokens;
    private readonly int _max;
    private int _index;
    internal readonly ErrorSink ErrorSink;

    internal Token? Current => _index < _max ? _tokens[_index] : null;
    
    internal Token? At(int i = 0) => _index + i > -1 && _index + i < _max ? _tokens[_index + i] : null;
    
    internal Token? Take() {
        var result = Current;
        _index += 1;
        return result;
    }
    
    internal Token? Take(TokenType tokenType)
    {
        var result = Current;
        if (result != tokenType && result is not null)
        {
            // error message will be handled at the caller level
            return null;
        }
        
        _index += 1;
        return result;
    }

    internal Token? TakeWithoutSpace(TokenType? tokenType = null)
    {
        // skip the whitespace tokens when we're looking
        // for a specific token type.
        while (Current == TokenType.WhiteSpace) Take();
        
        return tokenType is not null ? Take((TokenType)tokenType) : Take();
    }
    
    public Parser(IEnumerable<Token> tokens, ErrorSink errorSink)
    {
        this._tokens = tokens.ToList();
        this._max = _tokens.Count;
        this._index = 0;
        this.ErrorSink = errorSink;
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

    internal Token? ParseIdentifier()
    {
        var id = TakeWithoutSpace(TokenType.Identifier);
        if (id is null)
        {
            this.ErrorSink.AddError(Current ?? Token.Default, ErrorType.InvalidIdentifier,
                $"Expected an Identifier but received a '{Current?.TokenType ?? TokenType.Unknown}'.");
            return null;
        }

        return id;
    }
}