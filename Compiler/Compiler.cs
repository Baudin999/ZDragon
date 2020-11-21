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

        public CompilationResult Compile(ContextType initialContext = ContextType.None)
        {
            var errorSink = new ErrorSink();
            var tokens = new Lexer(this.SourceCode, errorSink).Tokenize(initialContext).ToList();
            var contextualTokens = new ContextualTokenizer(tokens, errorSink).Tokenize(initialContext).ToList();

            var ast = new TokenBlockParser(contextualTokens, errorSink).Parse().ToList();

            return new CompilationResult(ast, contextualTokens, errorSink);

            //return new CompilationResult(new List<AstNode>(), contextualTokens, errorSink);
        }

    }

}