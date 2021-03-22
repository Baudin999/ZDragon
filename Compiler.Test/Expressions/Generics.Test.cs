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
            Assert.Equal(3, compilerResult.Lexicon.Count);

            var personRequest = (RecordNode)compilerResult.Lexicon["PersonRequest"];
            Assert.IsType<RecordNode>(personRequest);
            Assert.Equal(2, personRequest.Fields.Count);

            var type = personRequest.Fields[0];
            var body = personRequest.Fields[1];
            Assert.Equal("Type", type.Id);
            Assert.Equal("String", type.Types[0]);

            Assert.Equal("Body", body.Id);
            Assert.Equal("Person", body.Types[0]);

        }
    }
}
