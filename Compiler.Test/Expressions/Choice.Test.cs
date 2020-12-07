using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class Choice {
        [Fact(DisplayName = "Choice - Gender")]
        public void Data_Maybe() {
            var code = @"
choice Gender =
    | ""Male""
    | ""Female""
    | ""Other""
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ChoiceNode>(compilerResult.Ast.First());

            var gender = (ChoiceNode)compilerResult.Ast.First();
            Assert.Equal(3, gender.Fields.Count);

            Assert.Equal("\"Male\"", gender.Fields[0].Value);
            Assert.Equal("\"Female\"", gender.Fields[1].Value);
            Assert.Equal("\"Other\"", gender.Fields[2].Value);

        }

        [Fact(DisplayName = "Choice - Same Type Error")]
        public void Data_SameTypeError() {
            var code = @"
choice Gender =
    | ""Male""
    | ""Female""
    | 12
    | ""Other""
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.ErrorSink.Errors);

        }


        [Fact(DisplayName = "Choice - Mixed")]
        public void Choice_Mixed() {
            var code = @"
data Maybe 'a =
    | Some 'a
    | Nothing
type Name = String;
choice Gender =
    | ""Male""
    | ""Female""
    | ""Other""
record Person =
    FirstName: Name;
    LastName: Maybe String;
    Gender: Gender;
    
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Equal(4, compilerResult.Tokens.Count());

        }



    }
}
