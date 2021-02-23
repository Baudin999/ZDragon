using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Architecture {
    public class Interaction {
        [Fact(DisplayName = "Interaction - Simple")]
        public void EndPoint_Simple() {
            var code = @"

component FromComponent

interaction FromTo =
    From: FromComponent
    To: ToComponent

component ToComponent

";
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Empty(compilerResult.Errors);

        }


        [Fact(DisplayName = "Interaction - Type Errors 001")]
        public void EndPoint_TypeErrors001() {
            var code = @"
interaction FromTo =
    From: GetDataFromToComponent
    To: ToComponent
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(2, compilerResult.Errors.Count);

        }
    }
}



