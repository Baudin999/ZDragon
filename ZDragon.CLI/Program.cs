// See https://aka.ms/new-console-template for more information

using ZDragon.Compiler;

namespace ZDragon.CLI
{
    public static class Program
    {
        public static void Main()
        {
            
            var code = @"

@ This is an annotation
component Foo

";

            var errorSink = new ErrorSink();
            var lexer = new Lexer(errorSink);
            var result = lexer.Lex(code);


            var parser = new Parser(result, errorSink);
            var nodes = parser.Parse().ToList();


            Console.WriteLine(nodes.Count);
        }
    }
}

