using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Documentation {
    public class Directives {
        [Fact(DisplayName = "Markdown - Directive")]
        public void Markdown_Directive() {
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

        [Fact(DisplayName = "Markdown - Directive Multi Key")]
        public void Markdown_Directive_MultiKey() {
            var code = @"% class details: True";
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Empty(compilerResult.Errors);

            var directive = (DirectiveNode)compilerResult.Ast.First();
            Assert.NotNull(directive);
            Assert.Equal("class details", directive.Id);
            Assert.Equal("True", directive.Literal);


        }

        [Fact(DisplayName = "Markdown - Directive Multi Key 02")]
        public void Markdown_Directive_MultiKey_02() {
            var code = @"

% Title: Some title
% Author: Peter Pan
% Date: 07/03/2021
% Image: /images/zdragon.jpg

% component details: True

open D_ART.Components.RMS;
open D_ART.Components.General;

";
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Empty(compilerResult.Errors);

            var directiveValue = compilerResult.ParseBooleanDirective("component details");
            Assert.NotNull(directiveValue);
            Assert.True(directiveValue);

            var directive = compilerResult.Ast.FirstOrDefault(n => n is DirectiveNode dn && dn.Key == "component details") as DirectiveNode;
            Assert.NotNull(directive);
            if (directive != null) {
                Assert.Equal("component details", directive.Key);
            }

        }
    }
}
