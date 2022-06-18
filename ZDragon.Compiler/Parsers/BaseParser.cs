using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Parsers;

public abstract class BaseParser
{
    private readonly Parser _parser;
    protected Token? Take() => _parser.Take();
    protected Token? Take(TokenType tokenType) => _parser.Take(tokenType);

    protected BaseParser(Parser parser)
    {
        this._parser = parser;
    }

    internal abstract IAstNode? Parse();
}