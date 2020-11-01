using Compiler.Language;
using Compiler.Symbols;
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

        public CompilationResult Compile()
        {
            var errorSink = new ErrorSink();
            var tokens = new Lexer(this.SourceCode, errorSink).Tokenize().ToList();
            var contextualTokens = new ContextualTokenizer(tokens, errorSink).Tokenize().ToList();
            var ast = new Parser(contextualTokens, errorSink).Parse().ToList();

            return new CompilationResult(ast, contextualTokens, errorSink);
        }

    }

}