using Compiler.Symbols;

namespace Compiler.Language.Nodes {
    public interface IIdentifierExpressionNode {
        Token IdToken { get; }
        string Id { get; }

        bool Imported { get; set; }
        string? Namespace { get; set; }

        AstNode Copy();
    }
}
