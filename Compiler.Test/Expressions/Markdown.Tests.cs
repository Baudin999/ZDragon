using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class Markdown {
        [Fact(DisplayName = "Markdown - Example 01")]
        public void Markdown_Example01() {
            var code = @"
# Chapter One

This is the core part of the documentation
we can write in multiple lines and see what will 
happen to the output:

 * First
 * Second
 * Third
    * With indent 1
    * With indent 2
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Equal(2, compilerResult.Tokens.Count());
            Assert.Equal(2, compilerResult.Ast.Count());
        }


        [Fact(DisplayName = "Markdown - Example 02")]
        public void Markdown_Example02() {
            var code = @"
# Chapter One

This is the core part of the documentation
we can write in multiple lines and see what will 
happen to the output:

 * First
 * Second
 * Third
    * With indent 1
    * With indent 2

type Name = String;
type Age = Number;

record Person =
    FirstName: Name;
    LastName: Name;
    Age: Number;

let peterPan = 
    Person { 
        FirstName = ""Peter"",
        LastName = ""Pan""
    };

";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Equal(6, compilerResult.Tokens.Count());
            Assert.Equal(6, compilerResult.Ast.Count());
        }
    }
}
