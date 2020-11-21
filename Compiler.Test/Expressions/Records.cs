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
record Person 'a 'b extends Mammal =

    FirstName: String;

    @ The last name
    @ And some more annotations
    LastName: Maybe String;

    Age: Number
        & min 0
        @ might have to be larger
        & max 100
    ;

end
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.True(compilerResult.Tokens.Count() > 10);

            //Assert.Equal(SyntaxKind.EndBlock, compilerResult.Tokens.Last().Kind);
            Assert.Single(compilerResult.Tokens.Where(t => t.Tokens.First().Kind == SyntaxKind.EndBlock));
        }


    }
}
