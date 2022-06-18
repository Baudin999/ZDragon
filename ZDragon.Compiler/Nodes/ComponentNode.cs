namespace ZDragon.Compiler.Nodes;

public class ComponentNode : IAstNode, IIdentifierNode
{
    public Token IdToken { get; }
    public string Id => IdToken.Text;

    public ComponentNode(Token id)
    {
        this.IdToken = id;
    }

}