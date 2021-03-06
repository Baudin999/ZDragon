using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Language {
    public class Choice {
        [Fact(DisplayName = "Choice - Gender")]
        public void Choice_Gender() {
            var code = @"
choice Gender =
    | ""Male""

    @ The female gender
    | ""Female""
    | ""Other""
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ChoiceNode>(compilerResult.Ast.First());

            var gender = (ChoiceNode)compilerResult.Ast.First();
            Assert.Equal(3, gender.Fields.Count);

            Assert.Equal("\"Male\"", gender.Fields[0].Value);
            Assert.Equal("\"Female\"", gender.Fields[1].Value);
            Assert.Equal("\"Other\"", gender.Fields[2].Value);


            Assert.Equal("The female gender", gender.Fields[1].AnnotationNode?.Annotation ?? "");

        }

        [Fact(DisplayName = "Choice - Same Type Error")]
        public void Choice_SameTypeError() {
            var code = @"
choice Gender =
    | ""Male""
    | ""Female""
    | 12
    | ""Other""
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.ErrorSink.Errors);

        }


        [Fact(DisplayName = "Choice - Two Choices")]
        public void Choice_TwoChoices() {
            var code = @"
choice Gender =
    | ""Male""
    | ""Female""
    | ""Other""

choice Age =
    | ""Old""
    | ""Young""
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(2, compilerResult.Tokens.Count());
            Assert.Equal(2, compilerResult.Ast.Count());
            Assert.Empty(compilerResult.ErrorSink.Errors);

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
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(4, compilerResult.Tokens.Count());

        }



    }
}
