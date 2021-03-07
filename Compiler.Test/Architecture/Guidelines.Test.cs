using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Architecture {
    public class Guidelines {
        [Fact(DisplayName = "Guideline - Simple 001")]
        public void Guideline_Simple_001() {
            var code = @"
guideline FirstGuideline =
    Name: First Guideline
    Description: This is a guideline, you should
        adhere to this guideline!
    Rationale: The reason why you need to adhere
        to this guideline is because things will
        go well if you do, and badly if you don't.
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.Single(compilerResult.Tokens);
            Assert.IsType<GuidelineNode>(compilerResult.Ast.First());

            var guidelineNode = (GuidelineNode)compilerResult.Ast.First();
            Assert.Equal("FirstGuideline", guidelineNode.Id);
            Assert.Equal(3, guidelineNode.Attributes.Count());

        }
    }
}
