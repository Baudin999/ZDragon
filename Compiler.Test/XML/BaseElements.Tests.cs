using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Markup {
    public class BaseElements {
        [Fact(DisplayName = "Markup - div")]
        public void Expression_OnlyName() {
            var code = @"
<div id=""myDiv"">
    <p>This is a paragraph</p>
</div>
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.IsType<MarkupNode>(compilerResult.Ast.First());
        }
    }
}
