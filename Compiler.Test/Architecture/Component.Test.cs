using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Architecture {
    public class Component {
        [Fact(DisplayName = "Component - Simple")]
        public void Component_Simple() {
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

        [Fact(DisplayName = "Component - Number Field")]
        public void Component_NumberField() {
            var code = @"
component App =
    Version: 3
    Allowed: True
    
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ComponentNode>(compilerResult.Ast.First());

            var componentNode = (ComponentNode)compilerResult.Ast.First();
            Assert.Equal("App", componentNode.Id);
            Assert.Equal(2, componentNode.Attributes.Count);

            var versionAttribute = componentNode.Attributes[0];
            Assert.Equal("Version", versionAttribute.Key);
            Assert.Equal(3, versionAttribute.Convert<int>());

            var allowedAttribute = componentNode.Attributes[1];
            Assert.Equal("Allowed", allowedAttribute.Key);
            Assert.True(allowedAttribute.Convert<bool>());

        }

        [Fact(DisplayName = "Component - List Field")]
        public void Component_ListField() {
            var code = @"
component Stew =
    Ingredients: 
        - Meat
        - Herbs
        - Spices
        - Vegetables
    
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ComponentNode>(compilerResult.Ast.First());

            var componentNode = (ComponentNode)compilerResult.Ast.First();
            Assert.Equal("Stew", componentNode.Id);
            Assert.Single(componentNode.Attributes);

            var ingredientsAttribute = componentNode.Attributes[0];
            Assert.Equal("Ingredients", ingredientsAttribute.Key);
            Assert.Equal(4, ingredientsAttribute.Items.Count);

        }


    }
}
