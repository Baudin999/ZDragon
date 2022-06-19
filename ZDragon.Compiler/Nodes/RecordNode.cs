using ZDragon.Compiler.Parsers;

namespace ZDragon.Compiler.Nodes;

public class RecordNode : IAstNode, IIdentifierNode
{
    public List<RecordField> Fields { get; }
    public Token IdToken { get; }
    public string Id => IdToken.Text;

    public RecordNode(Token id, List<RecordField> fields)
    {
        this.IdToken = id;
        this.Fields = fields;
    }

}