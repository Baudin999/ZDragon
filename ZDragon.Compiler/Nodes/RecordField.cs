namespace ZDragon.Compiler.Nodes;

public class RecordField : IIdentifierNode
{
    public Token IdToken {get;}
    public string Id => IdToken.Text;
    public TypeExpression Type {get;}

    public RecordField(Token id, TypeExpression type)
    {
        IdToken = id;
        Type = type;
    }
}