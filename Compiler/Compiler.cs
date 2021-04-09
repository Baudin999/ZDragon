using Compiler.Checkers;
using Compiler.Language;
using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler {

    public class Compiler {
        public readonly CompilationCache Cache;
        public string Code { get; private set; }
        public string Namespace { get; }
        public SourceCode SourceCode { get; set; }

        public Compiler(string code) {
            this.Cache = new CompilationCache(new ErrorSink());
            this.Code = code;
            this.Namespace = "base";
            this.SourceCode = new SourceCode(code);
        }

        public Compiler(string code, string ns) {
            this.Cache = new CompilationCache(new ErrorSink());
            this.Code = code;
            this.Namespace = ns;
            this.SourceCode = new SourceCode(code);
        }

        public Compiler(string code, string ns, CompilationCache cache) {
            this.Cache = cache;
            this.Code = code;
            this.Namespace = ns;
            this.SourceCode = new SourceCode(code);
        }

        public CompilationResult Compile() {
            var initialContext = ContextType.None;
            var tokens = new Lexer(this.SourceCode, Cache.ErrorSink).Tokenize(initialContext).ToList();
            var contextualTokens = new ContextualTokenizer(tokens, Cache.ErrorSink).Tokenize(initialContext).ToList();
            var ast = new ContextualParser(contextualTokens, Cache.ErrorSink)
                .Parse()
                .ParseIncludeNodes(Cache)
                .ToList();
            var lexicon = new Lexicon(ast, Cache, this.Namespace).CreateLexicon();
            var document = ast.OfType<IDocumentNode>();
            var referencedModules = ast.OfType<OpenNode>();

            // cannot typecheck without compilation cache
            var compilationResult = new CompilationResult(ast, contextualTokens, Cache, referencedModules, lexicon, document, this.Namespace);
            Cache.Add(this.Namespace, compilationResult);
            return compilationResult;
        }
    }

    internal static class NodeHelpers {
        internal static IEnumerable<AstNode> ParseIncludeNodes(this IEnumerable<AstNode> ast, CompilationCache cache) {
            foreach (var node in ast) {
                if (node is IncludeNode include && include.Id != "components") {
                    if (cache.Has(include.Namespace)) {
                        var found = false;
                        var module = cache.Get(include.Namespace);
                        foreach (var _node in module.Ast) {
                            if (found && _node is IDocumentNode) {
                                var result = _node.Copy();
                                result.Imported = true;
                                result.ImportedFrom = include.Namespace;
                                yield return result;
                            }
                            if (_node is DirectiveNode dn) {
                                if (dn.Key == "region" && dn.Value == include.Id) found = true;
                                if (dn.Key == "endregion" && dn.Value == include.Id) found = false;
                            }
                        }
                    }
                }
                else {
                    yield return node;
                }
            }
        }
    }

}