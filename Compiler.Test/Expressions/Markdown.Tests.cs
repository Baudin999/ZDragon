using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class Markdown {
        [Fact(DisplayName = "Markdown - Example 01")]
        public void Expression_OnlyName() {
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

            Assert.Equal(3, compilerResult.Tokens.Count());
            Assert.Equal(3, compilerResult.Ast.Count());
        }
    }
}
