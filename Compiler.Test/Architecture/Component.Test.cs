using Compiler;
using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Architecture {
    public class Component {
        [Fact(DisplayName = "Component - Simple 001")]
        public void Component_Simple_001() {
            var code = @"
component Application001 =
    Name: First Application
    Description: This is the first appalication
        As you can see we can add multi-line descriptions
        to our components.
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
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

        [Fact(DisplayName = "Component - Simple 002")]
        public void Component_Simple_002() {
            var code = @"
component Application001
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ComponentNode>(compilerResult.Ast.First());

            var componentNode = (ComponentNode)compilerResult.Ast.First();
            Assert.Equal("Application001", componentNode.Id);
            Assert.Empty(componentNode.Attributes);
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

            Assert.Empty(compilerResult.Errors);
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

        [Fact(DisplayName = "Component - Linked Components 000")]
        public void Component_LinkedComponents000() {
            var code = @"
component Foo =
    Name: The foo component
    Interactions: 
        - Bar

component Bar =
    Name: The Bar component
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(2, compilerResult.Tokens.Count());
            Assert.Empty(compilerResult.Errors);
            
        }


        [Fact(DisplayName = "Component - Linked Components 001")]
        public void Component_LinkedComponents001() {
            var code = @"
component Foo =
    Interactions: 
        - Bar
    
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Errors);
            Assert.Equal(ErrorType.Unknown, compilerResult.Errors.First().ErrorType);
        }

        [Fact(DisplayName = "Component - Import Open")]
        public void Component_ImportOpen() {
            var errorSink = new ErrorSink();
            var codeFirst = @"
component Foo =
    Name: Footje
";
            var codeSecond = @"
open BaseComponents;
component Bar =
    Interactions:
        - Foo
";
            var cache = new CompilationCache(errorSink);
            var compilerResultFirst = new Compiler.Compiler(codeFirst, "BaseComponents", cache).Compile().Check();
            var compilerResultSecond = new Compiler.Compiler(codeSecond, "Components", cache).Compile().Check();

            Assert.NotNull(compilerResultFirst);
            Assert.NotNull(compilerResultSecond);

            Assert.Empty(errorSink.Errors);
        }


        [Fact(DisplayName = "Component - Extend")]
        public void Component_Extend() {
            var errorSink = new ErrorSink();
            var codeFirst = @"
component Foo =
    Name: Footje
";
            var codeSecond = @"

component Foo extends BaseComponents.Foo =
    Title: New Foo

";
            var cache = new CompilationCache(errorSink);
            var compilerResultFirst = new Compiler.Compiler(codeFirst, "BaseComponents", cache).Compile().Check();
            var compilerResultSecond = new Compiler.Compiler(codeSecond, "Components", cache).Compile().Check();

            Assert.NotNull(compilerResultFirst);
            Assert.NotNull(compilerResultSecond);

            Assert.Empty(errorSink.Errors);

            var foo = (ComponentNode)compilerResultSecond.Lexicon["Foo"];
            Assert.Single(foo.Extensions);
            Assert.Equal(2, foo.Attributes.Count);
        }

        [Fact(DisplayName = "System - EmptyContains")]
        public void System_EmptyContains() {
            var errorSink = new ErrorSink();
            var codeFirst = @"
system Foo =
    Contains:
";
            
            var result = new Compiler.Compiler(codeFirst).Compile().Check();
            Assert.Empty(result.Errors);
            var contains = ((SystemNode)result.Lexicon["Foo"]).GetAttributeItems("Contains");
            Assert.NotNull(contains);
            Assert.Empty(contains);
        }

        [Fact(DisplayName = "Component - Paragraph after Component")]
        public void Component_Paragraph_after_Component() {
            var code = @"
component Comp =
    Name: First Application
With a pragraph
";
            var result = new Compiler.Compiler(code).Compile().Check();
            Assert.Equal(2, result.Ast.Count);
        }


        [Fact(DisplayName = "Component - Component in Document")]
        public void Component_ComponentInDocument() {
            var code = @"
# Catalog

This is a component template.

component Catalog =
    Name: Catalog
    Description: The component description, this
        can be multiline with indentation based 
        syntax rules!

";
            var result = new Compiler.Compiler(code).Compile().Check();
            Assert.Equal(3, result.Ast.Count);

            Assert.IsType<MarkdownChapterNode>(result.Ast[0]);
            Assert.IsType<MarkdownNode>(result.Ast[1]);
            Assert.IsType<ComponentNode>(result.Ast[2]);
        }

    }
}
