using Xunit;

namespace Expressions {
    public class RecordLiteral {

        [Fact(DisplayName = "Record Literal - Person")]
        public void Expression_OnlyName() {
            var code = @"
let peterPan = Person {
        FirstName = ""Peter"",
        LastName = ""Pan""
    };
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
        }
    }
}
