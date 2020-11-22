using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class Data {
        [Fact(DisplayName = "Data - Maybe")]
        public void Expression_OnlyName() {
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
    }
}
