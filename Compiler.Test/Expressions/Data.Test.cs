using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class Data {
        [Fact(DisplayName = "Data - Maybe")]
        public void Data_Maybe() {
            var code = @"
data Maybe 'a =
    | Some 'a
    | Nothing
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<DataNode>(compilerResult.Ast.First());

            var data = (DataNode)compilerResult.Ast.First();
            Assert.Equal(2, data.Fields.Count);

            var some = data.Fields.First();
            Assert.Equal("Some", some.Id);
            Assert.Equal(2, some.Types.Count);
            
            var nothing = data.Fields.Last();
            Assert.Equal("Nothing", nothing.Id);
            Assert.Single(nothing.Types);
        }


        [Fact(DisplayName = "Data - Boolean")]
        public void Data_Booleran() {
            var code = @"
data Boolean =
    | True
    | False
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<DataNode>(compilerResult.Ast.First());

            var data = (DataNode)compilerResult.Ast.First();
            Assert.Equal(2, data.Fields.Count);

            var _true = data.Fields.First();
            Assert.Equal("True", _true.Id);
            Assert.Single(_true.Types);

            var _false = data.Fields.Last();
            Assert.Equal("False", _false.Id);
            Assert.Single(_false.Types);
        }

        [Fact(DisplayName = "Data - Mixed")]
        public void Data_Mixed() {
            var code = @"
data Maybe 'a =
    | Some 'a
    | Nothing
data Boolean =
    | True
    | False
type Name = String;
record Person =
    FirstName: Name;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Equal(4, compilerResult.Tokens.Count());
            
        }
    }
}
