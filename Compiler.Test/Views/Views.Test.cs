using Compiler;
using Compiler.Language.Nodes;
using Xunit;

namespace Views {
    public class Views {

        [Fact(DisplayName = "Views - Simple")]
        public void Views_Simple() {
            var codeFirst = @"
view PersonView = 
    Person
    Address

record Person
record Address
";

            var result = new Compiler.Compiler(codeFirst).Compile().Check();

            Assert.Empty(result.Errors);
            Assert.True(result.Lexicon.ContainsKey("PersonView"));
            Assert.IsType<ViewNode>(result.Lexicon["PersonView"]);
            var personView = (ViewNode)result.Lexicon["PersonView"];
            Assert.Equal("PersonView", personView.Id);
            Assert.Equal(2, personView.Nodes.Count);
        }


        [Fact(DisplayName = "Views - Missing link")]
        public void Views_MissingLink() {
            var codeFirst = @"
view PersonView = 
    Person
    Address

record Person
";

            var result = new Compiler.Compiler(codeFirst).Compile().Check();

            Assert.Single(result.Errors);
        }

    }
}
