using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class Generics {
        [Fact(DisplayName = "Generics - Other")]
        public void Generics_Other() {
            var code = @"
data Other 'a =
    | Something 'a
    | Nothing
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);

        }


        [Fact(DisplayName = "Generics - Application")]
        public void Generics_Application() {
            var code = @"
record Request 'a =
    Type: String;
    Body: 'a;

record Person =
    FirstName: String;
    LastName: Maybe String;

type PersonRequest = Request Person;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);

            var personRequest = compilerResult.Lexicon["PersonRequest"];
            Assert.IsType<RecordNode>(personRequest);
        }
    }
}
