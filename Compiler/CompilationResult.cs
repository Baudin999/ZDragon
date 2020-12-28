using Compiler.Checkers;
using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler {
    public class CompilationResult {
        public IEnumerable<TokenGroup> Tokens { get; }
        public List<AstNode> Ast { get; }
        public ErrorSink ErrorSink { get; }
        public Dictionary<string, AstNode> Lexicon { get; }
        public IEnumerable<IDocumentNode> Document { get; }
        public List<Error> Errors => ErrorSink.Errors;
        public string Namespace { get; }
        public List<OpenNode> References { get; }

        public CompilationResult(List<AstNode> ast, IEnumerable<TokenGroup> tokens, ErrorSink errorSink, IEnumerable<OpenNode> references, Dictionary<string, AstNode> lexicon, IEnumerable<IDocumentNode> document, string ns) {
            this.Tokens = tokens.ToList();
            this.Ast = ast;
            this.ErrorSink = errorSink;
            this.Lexicon = lexicon;
            this.Document = document;
            this.Namespace = ns;
            this.References = references.ToList();
        }

        public CompilationResult Check() {
            new TypeChecker(new CompilationCache(this.ErrorSink), this).Check();
            return this;
        }

        public CompilationResult Check(CompilationCache cache) {
            new TypeChecker(cache, this).Check();
            return this;
        }

    }
}