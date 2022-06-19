using ZDragon.Compiler.Parsers;

namespace ZDragon.Compiler.Nodes;

public class ComponentNode : IAstNode, IIdentifierNode
{
    public Token IdToken { get; }
    public string Id => IdToken.Text;
    public List<ArchitectureField> Fields { get; }

    public ComponentNode(Token id, List<ArchitectureField> architectureFields)
    {
        this.IdToken = id;
        this.Fields = architectureFields;
    }

}