using System;
using System.Linq;

namespace CLI {
    class Program
    {
        static void Main(string[] args)
        {
            var code = "This is my code...";
            var compiler = new Compiler.Compiler(code);
            var compilationResult = compiler.Compile();

            Logger.Log(compilationResult.Tokens.ToList());

            Console.WriteLine("Hello World!");
        }
    }
}
