using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Markdown {
    public class Requirements {
        [Fact(DisplayName = "Requirement - Simple")]
        public void Requirements_Simple() {
            var code = @"
requirement MyRequirement =
    Name: Hoi
";
            var compilationResult = new Compiler.Compiler(code).Compile().Check();
            

            Assert.Single(compilationResult.Tokens);
            Assert.Single(compilationResult.Ast);
            Assert.Empty(compilationResult.Errors);

            var requirement = compilationResult.Document.First();
            Assert.IsType<RequirementNode>(requirement);

        }
    }
}
 