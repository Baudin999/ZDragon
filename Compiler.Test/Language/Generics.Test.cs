using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Language {
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



        [Fact(DisplayName = "Records - Generic Field Type Parameters")]
        public void Records_GenericFieldTypeParameters() {
            var code = @"
record Person 'a =
    FirstName: 'a;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Ast);
            Assert.Empty(compilerResult.Errors);

        }

        [Fact(DisplayName = "Records - Generic Field: E01")]
        public void Records_GenericFieldE01() {
            var code = @"
record Person 'a =
    FirstName: 'b;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Ast);
            Assert.Single(compilerResult.Errors);
            Assert.Equal("Undeclared generic parameter \"'b\" on field 'FirstName' of record 'Person'.", compilerResult.Errors.First().Message);
        }

        [Fact(DisplayName = "Records - Generic Field: E02")]
        public void Records_GenericFieldE02() {
            var code = @"
record Person 'a =
    FirstName: 'b;
    LastName: 'c;
    Street: 'd;
    HouseNumber: 'a;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Ast);
            Assert.Equal(3, compilerResult.Errors.Count);
            Assert.Equal("Undeclared generic parameter \"'b\" on field 'FirstName' of record 'Person'.", compilerResult.Errors[0].Message);
            Assert.Equal("Undeclared generic parameter \"'c\" on field 'LastName' of record 'Person'.", compilerResult.Errors[1].Message);
            Assert.Equal("Undeclared generic parameter \"'d\" on field 'Street' of record 'Person'.", compilerResult.Errors[2].Message);
        }
    }
}
