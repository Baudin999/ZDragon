namespace ZDragon.Compiler.Nodes;

public class TypeExpression : IIdentifierNode
{
    public Token IdToken { get; }
    public string Id => IdToken.Text;

    public TypeExpression(Token idToken)
    {
        this.IdToken = idToken;
    }

    public override string ToString()
    {
        return Id;
    }
}

