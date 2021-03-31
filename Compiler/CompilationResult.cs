using Compiler.Checkers;
using Compiler.Language.Nodes;
using Compiler.Symbols;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Compiler {
    public class CompilationResult {
        public IEnumerable<TokenGroup> Tokens { get; }
        public List<AstNode> Ast { get; }
        public CompilationCache CompilationCache { get; }
        public ErrorSink ErrorSink => CompilationCache.ErrorSink;
        public Dictionary<string, IIdentifierExpressionNode> Lexicon { get; }
        public IEnumerable<IDocumentNode> Document { get; }
        public List<Error> Errors => ErrorSink.Errors;
        public List<Warning> Warnings => ErrorSink.Warnings;
        public string Namespace { get; }
        public List<OpenNode> References { get; }

        public CompilationResult(List<AstNode> ast, IEnumerable<TokenGroup> tokens, CompilationCache cache, IEnumerable<OpenNode> references, Dictionary<string, IIdentifierExpressionNode> lexicon, IEnumerable<IDocumentNode> document, string ns) {
            if (cache is null) throw new System.Exception("Cache cannot be null!");
            this.Tokens = tokens.ToList();
            this.Ast = ast;
            this.CompilationCache = cache;
            this.Lexicon = lexicon;
            this.Document = document;
            this.Namespace = ns;
            this.References = references.ToList();
        }

        public CompilationResult Check() {
            new TypeChecker(this.CompilationCache, this).Check();
            return this;
        }


        public bool? ParseBooleanDirective(string key) {
            var directive = this.Ast.FirstOrDefault(node => node is DirectiveNode dn && dn.Key == key) as DirectiveNode;
            if (directive is not null) {
                _ = bool.TryParse(directive.Value.ToLower(), out bool result);
                return result;
            }
            return null;
        }


    }
}