using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Markdown {
    public class Directives {
        [Fact(DisplayName = "Markdown - Directive")]
        public void TwoWords() {
            var code = @"% version: 0.0.1";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Empty(compilerResult.Errors);

            var directive = (DirectiveNode)compilerResult.Ast.First();
            Assert.NotNull(directive);
            Assert.Equal("version", directive.Id);
            Assert.Equal("0.0.1", directive.Literal);


        }
    }
}
