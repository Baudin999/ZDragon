using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Parsers;

public class RecordParser : BaseParser
{
    

    public RecordParser(Parser parser) : base(parser)
    {
    }

    internal override IAstNode? Parse()
    {
        var keyWordRecord = Take();
        var id = Take(TokenType.Identifier);

        if (id is not null)
        {
            return new RecordNode(id);
        }
        else
        {
            return null;
        }
    }
}