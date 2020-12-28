using Compiler.Checkers;
using Compiler.Language;
using Compiler.Language.Nodes;
using Compiler.Linker;
using Compiler.Symbols;
using System.Linq;

namespace Compiler {

    public class Compiler
    {
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

        public Compiler(string code, string ns)
        {
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
            var ast = new ContextualParser(contextualTokens, Cache.ErrorSink).Parse().ToList();
            var lexicon = new Lexicon(Cache.ErrorSink, ast).CreateLexicon();
            var document = ast.OfType<IDocumentNode>();
            var referencedModules = ast.OfType<OpenNode>();

            // cannot typecheck without compilation cache
            var compilationResult = new CompilationResult(ast, contextualTokens, Cache.ErrorSink, referencedModules, lexicon, document, this.Namespace);
            Cache.Add(this.Namespace, compilationResult);
            return compilationResult;
            
        }

        public CompilationResult Compile(ContextType initialContext = ContextType.None)
        {
            var tokens = new Lexer(this.SourceCode, this.Cache.ErrorSink).Tokenize(initialContext).ToList();
            var contextualTokens = new ContextualTokenizer(tokens, this.Cache.ErrorSink).Tokenize(initialContext).ToList();
            var ast = new ContextualParser(contextualTokens, this.Cache.ErrorSink).Parse().ToList();
            var lexicon = new Lexicon(this.Cache.ErrorSink, ast).CreateLexicon();
            var document = ast.OfType<IDocumentNode>();
            var referencedModules = ast.OfType<OpenNode>();
            var compilationResult = new CompilationResult(ast, contextualTokens, this.Cache.ErrorSink, referencedModules, lexicon, document, this.Namespace);

            new TypeChecker(this.Cache, compilationResult).Check();

            Cache.Add(this.Namespace, compilationResult);
            return compilationResult;
        }

        public CompilationResult Compile(bool typeCheck) {
            var initialContext = ContextType.None;
            var tokens = new Lexer(this.SourceCode, this.Cache.ErrorSink).Tokenize(initialContext).ToList();
            var contextualTokens = new ContextualTokenizer(tokens, this.Cache.ErrorSink).Tokenize(initialContext).ToList();
            var ast = new ContextualParser(contextualTokens, this.Cache.ErrorSink).Parse().ToList();
            var lexicon = new Lexicon(this.Cache.ErrorSink, ast).CreateLexicon();
            var document = ast.OfType<IDocumentNode>();
            var referencedModules = ast.OfType<OpenNode>();
            var compilationResult = new CompilationResult(ast, contextualTokens, this.Cache.ErrorSink, referencedModules, lexicon, document, this.Namespace);

            if (typeCheck) {
                new TypeChecker(this.Cache, compilationResult).Check();
            }

            this.Cache.Add(this.Namespace, compilationResult);
            return compilationResult;
        }



    }

}