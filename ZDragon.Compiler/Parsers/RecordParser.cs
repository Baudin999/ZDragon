using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Parsers;

public class RecordParser : BaseParser
{

    private bool _hasField()
    {
        return Current == TokenType.NewLine &&
               At(1) == TokenType.Indent;
    }

    public RecordParser(Parser parser) : base(parser)
    {
    }

    internal override IAstNode? Parse()
    {
        var keyWordRecord = Take();
        var fields = new List<RecordField>();
        
        var id = ParserIdentifier();
        if (id is null) return null;
        
        var equals = TakeWithoutSpace(TokenType.Equals);
        if (equals is null) return new RecordNode(id, fields);
        
        while (_hasField())
        {
            var field = ParseRecordField();
            if (field is not null)
            {
                fields.Add(field);
            }
        }
        
        return new RecordNode(id, fields);
    }


    private RecordField? ParseRecordField()
    {
        Take(TokenType.NewLine);
        Take(TokenType.Indent);
        
        var fieldId = ParserIdentifier();
        if (fieldId is null)
        {
            Take();
        }

        Take(TokenType.Colon);
        var fieldType = ParseTypeExpression();
        
        // take a semicolon
        if (Current == TokenType.SemiColon) Take();

        if (fieldType is null || fieldId is null) return null;
        
        return new RecordField(fieldId ?? Token.Default, fieldType);
    }

    private TypeExpression? ParseTypeExpression()
    {
        var type = TakeWithoutSpace(TokenType.Identifier);
        if (type is not null)
        {
            return new TypeExpression(type);
        }
        else
        {
            return null;
        }
    }
}