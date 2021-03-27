using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Attributes {
    public class Attributes {
        [Fact(DisplayName = "Attributes - Nested")]
        public void Attributes_Nested() {
            var code = @"
component Foo =
    Name: Foo
    Server:
        Ip: 0.0.0.0
        Instances:
            - left
            - right
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
        }

    
    }
}


