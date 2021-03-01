using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public interface IIdentifierExpressionNode {
        Token IdToken { get; }
        string Id { get; }

        bool Imported { get; set; }
        string? ImportedFrom { get; set; }

        AstNode Copy();
    }
}
