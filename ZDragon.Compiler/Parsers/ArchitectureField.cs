using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Parsers;

public class ArchitectureField : IIdentifierNode
{
    public Token IdToken { get; }
    public string Id => IdToken.Text;
    public Token ContentToken { get; }
    public string Content => ContentToken.Text.Trim();
    public string ContentWithoutNewLines { get; }
    
    public ArchitectureField(Token id, Token content)
    {
        this.IdToken = id;
        this.ContentToken = content;
        ContentWithoutNewLines = 
            Content
                .Replace(Environment.NewLine, " ")
                .Replace("  ", " ");
    }

}