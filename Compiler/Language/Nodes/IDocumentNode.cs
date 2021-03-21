namespace Compiler.Language.Nodes {
    public interface IDocumentNode {
        string Content { get; }
        string Literal { get; }
        bool IsTemplate { get; }
    }
}
