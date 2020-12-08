using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class Open {
        [Fact(DisplayName = "Open - Simple")]
        public void Data_Maybe() {
            var code = @"
open Address
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<OpenNode>(compilerResult.Ast.First());

            var open = (OpenNode)compilerResult.Ast.First();
            Assert.Equal("Address", open.Id);
        }
    }
}
