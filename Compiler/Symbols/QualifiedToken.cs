using System.Collections.Generic;
using System.Linq;


namespace Compiler.Symbols {
    public class QualifiedToken : Token {
        public string QualifiedName { get; }
        public string Namespace { get; }
        public List<Token> NamespaceParts { get; }
        public List<Token> Parts { get; }
        public Token IdToken { get; }
        public string Id { 
            get { 
                return IdToken?.Value ?? throw new System.Exception("Invalid Id Token"); 
            } 
        }

        public QualifiedToken(List<Token> tokens) : base(tokens, SyntaxKind.IdentifierToken, 0) {

            this.QualifiedName = string.Join(".", tokens.Select(t => t.Value));
            this.NamespaceParts = Extensions.TakeAllButLast(tokens).ToList();
            this.Namespace = string.Join(".", this.NamespaceParts.Select(t => t.Value));
            this.Parts = tokens.OfType<Token>().ToList();
            this.IdToken = tokens.Last();
        }

        public override string ToString() {
            return $"{Kind} - {QualifiedName}";
        }

    }
}