using System;
using System.Linq;

namespace CLI {
    class Program
    {
        static void Main(string[] args)
        {
            var code = @"
record Person =
    FirstName: String;
    LastName: Maybe String;

type ValidatePerson = Person -> Boolean;


# Chapter 01

This is the chapter.
";
            var compiler = new Compiler.Compiler(code);
            var compilationResult = compiler.Compile().Check();

            string s = Logger.Log(compilationResult.Ast.First());
            Logger.Resolve(s);


            Console.WriteLine("Hello World!");
        }
    }
}
