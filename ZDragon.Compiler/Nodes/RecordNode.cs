namespace ZDragon.Compiler.Nodes;

public class RecordNode : IAstNode, IIdentifierNode
{
    public Token IdToken { get; }
    public string Id => IdToken.Text;

    public RecordNode(Token id)
    {
        this.IdToken = id;
    }

}