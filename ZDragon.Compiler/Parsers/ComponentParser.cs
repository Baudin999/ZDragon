using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Parsers;

public class ComponentParser : BaseParser
{
    public ComponentParser(Parser parser) : base(parser)
    {
        
    }

    internal override ComponentNode? Parse()
    {
        var keyWordComponent = Take(TokenType.KwComponent);
        var id = ParserIdentifier();
        if (id is null) return null;
        var fields = new List<ArchitectureField>();
        
        var equals = TakeWithoutSpace(TokenType.Equals);
        if (equals is null) return new ComponentNode(id, fields);

        while (_hasField())
        {
            Take(TokenType.NewLine);
            Take(TokenType.Indent);
            var fieldId = Take(TokenType.Identifier);
            if (fieldId is null)
            {
                ErrorSink.AddError(Current ?? Token.Default, ErrorType.InvalidIdentifier,
                    $"A field should have an Identifier.");
                continue;
            }
            
            TakeWithoutSpace(TokenType.Colon);

            var root = Take() ?? Token.Default;
            while (_stillInFieldDefinition())
            {
                if (Current == TokenType.Indent) Take();
                else root = root.Append(Take());
            }
            
            fields.Add(new ArchitectureField(fieldId, root));
        }

        return new ComponentNode(id, fields);
    }

    private bool _hasField()
    {
        return Current == TokenType.NewLine && At(1) == TokenType.Indent && At(2) != TokenType.Unknown;
    }

    private bool _stillInFieldDefinition()
    {
        // if (Current is null) return false;
        if (Current != TokenType.NewLine) return true;
        return Current == TokenType.NewLine && 
               At(1) == TokenType.Indent && 
               At(2) == TokenType.Indent;
    }
}