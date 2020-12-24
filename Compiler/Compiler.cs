using Compiler.Checkers;
using Compiler.Language;
using Compiler.Language.Nodes;
using Compiler.Linker;
using Compiler.Linking;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler {

    public class Compiler
    {
        public string Code { get; private set; }
        public SourceCode SourceCode { get; set; }

        public Compiler(string code)
        {
            this.Code = code;
            this.SourceCode = new SourceCode(code);
        }

        public CompilationResult Compile(ContextType initialContext = ContextType.None)
        {
            var errorSink = new ErrorSink();
            var tokens = new Lexer(this.SourceCode, errorSink).Tokenize(initialContext).ToList();
            var contextualTokens = new ContextualTokenizer(tokens, errorSink).Tokenize(initialContext).ToList();
            var ast = new ContextualParser(contextualTokens, errorSink).Parse().ToList();
            var lexicon = new Lexicon(errorSink, ast).CreateLexicon();
            new TypeChecker(errorSink, lexicon).Check();

            return new CompilationResult(ast, contextualTokens, errorSink, lexicon);
        }

        public CompilationResult Compile(bool typeCheck) {
            var initialContext = ContextType.None;
            var errorSink = new ErrorSink();
            var tokens = new Lexer(this.SourceCode, errorSink).Tokenize(initialContext).ToList();
            var contextualTokens = new ContextualTokenizer(tokens, errorSink).Tokenize(initialContext).ToList();
            var ast = new ContextualParser(contextualTokens, errorSink).Parse().ToList();
            var lexicon = new Lexicon(errorSink, ast).CreateLexicon();
            
            if (typeCheck) {
                new TypeChecker(errorSink, lexicon).Check();
            }

            return new CompilationResult(ast, contextualTokens, errorSink, lexicon);
        }

    }

}