namespace ZDragon.Compiler.Nodes;

public interface IIdentifierNode
{
    
    Token IdToken { get; }
    string Id { get; }

}