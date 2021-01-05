using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Architecture {
    public class Component {
        [Fact(DisplayName = "Component - Simple")]
        public void Data_Maybe() {
            var code = @"
component Application001 =
    Name: First Application
    Description: This is the first appalication
        As you can see we can add multi-line descriptions
        to our components.
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ComponentNode>(compilerResult.Ast.First());

            var componentNode = (ComponentNode)compilerResult.Ast.First();
            Assert.Equal("Application001", componentNode.Id);
            Assert.Equal(2, componentNode.Attributes.Count());


            var nameAttribute = componentNode.Attributes.First();
            var descriptionAttribute = componentNode.Attributes.Last();

            Assert.Equal("Name", nameAttribute.Key);
            Assert.Equal("First Application", nameAttribute.Value);

            Assert.Equal("Description", descriptionAttribute.Key);
            Assert.Equal("This is the first appalication As you can see we can add multi-line descriptions to our components.", descriptionAttribute.Value);
        }


    }
}
