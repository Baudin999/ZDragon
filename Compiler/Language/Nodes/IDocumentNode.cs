namespace Compiler.Language.Nodes {
    public interface IDocumentNode {
        string? OriginalNamespace { get; set; }

        string? InterpolatedContent { get; set; }
        string Content { get; }
        string Literal { get; }
        bool IsTemplate { get; }
    }
}
