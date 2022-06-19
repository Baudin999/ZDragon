using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Parsers;

public abstract class BaseParser
{
    private readonly Parser _parser;

    protected ErrorSink ErrorSink => _parser.ErrorSink;

    protected Token? Current => _parser.Current;
    protected Token? At(int i) => _parser.At(i);
    
    protected Token? Take() => _parser.Take();
    protected Token? Take(TokenType tokenType) => _parser.Take(tokenType);
    protected Token? TakeWithoutSpace(TokenType? tokenType) => _parser.TakeWithoutSpace(tokenType);
    

    protected BaseParser(Parser parser)
    {
        this._parser = parser;
    }

    protected Token? ParserIdentifier() => _parser.ParseIdentifier();
    internal abstract IAstNode? Parse();
    
}