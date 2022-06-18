using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Parsers;

public class ComponentParser : BaseParser
{
    public ComponentParser(Parser parser) : base(parser)
    {
        
    }

    internal override IAstNode? Parse()
    {
        var keyWordComponent = Take(TokenType.KwComponent);
        var id = Take(TokenType.Identifier);

        if (id is not null)
        {
            return new ComponentNode(id);
        }
        else
        {
            return null;
        }
    }
}