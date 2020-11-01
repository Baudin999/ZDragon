using System.Linq;
using Xunit;

namespace Compiler.Test {
    public class Type {

        [Fact]
        public void ParseType() {
            var code = @"

@ The person type
@ extends the Mammal
type Person 'a 'b extends Mammal ::
    FirstName: String;

    @ The last name
    LastName: Maybe String;

    Age: Number
        & min 0
        @ might have to be larger
        & max 100
";
            var compiler = new Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.True(compilerResult.Tokens.Count() > 10);
        }


    }
}
