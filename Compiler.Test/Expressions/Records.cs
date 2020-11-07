using System.Linq;
using Xunit;
using Compiler;

namespace Expressions {
    public class Records {

        [Fact(DisplayName = "Expression - parse person record")]
        public void ParseType() {
            var code = @"

@ The person record
@ extends the Mammal
record Person 'a 'b extends Mammal ::
    FirstName: String;

    @ The last name
    LastName: Maybe String;

    Age: Number
        & min 0
        @ might have to be larger
        & max 100
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.True(compilerResult.Tokens.Count() > 10);
        }


    }
}
