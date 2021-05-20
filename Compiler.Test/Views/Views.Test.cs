using Compiler;
using Compiler.Language.Nodes;
using System.Linq;
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


        [Fact(DisplayName = "Views - No Identifier")]
        public void Views_NoIdentifier() {
            var codeFirst = @"


view = 
    Person
    Address

record Person
record Address
";

            var result = new Compiler.Compiler(codeFirst).Compile().Check();
            Assert.Equal(3, result.Ast.Count);
            Assert.IsType<ViewNode>(result.Ast.First());
            Assert.Empty(result.Errors);
        }

        [Fact(DisplayName = "Views - No Equals sign")]
        public void Views_NoEqualsSign() {
            var codeFirst = @"


view
    Person
    Address

record Person
record Address
";

            var result = new Compiler.Compiler(codeFirst).Compile().Check();
            Assert.Single(result.Errors);
            Assert.Equal(ErrorKind.View_MissingEquals, result.Errors.First().ErrorType);
            Assert.Equal(2, result.Ast.Count);
            
        }


        [Fact(DisplayName = "Views - Mixing Types")]
        public void Views_MixingTypes() {
            var codeFirst = @"

view =
    Person
    PersonContainer

record Person
component PersonContainer
";

            var result = new Compiler.Compiler(codeFirst).Compile().Check();
            Assert.Single(result.Errors);
            Assert.Equal(ErrorKind.View_WrongFieldType, result.Errors.First().ErrorType);
            Assert.Equal(3, result.Ast.Count);

        }


        [Fact(DisplayName = "Views - With Comment")]
        public void Views_WithComment() {
            var codeFirst = @"
view PersonView = 
    {* Person *}
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
            Assert.Single(personView.Nodes);
        }

        [Fact(DisplayName = "Views - Change Title")]
        public void Views_ChangeTitle() {
            var codeFirst = @"
view PersonView = 
    Foo
        Title: Bar
        Render: False
        

component Foo
";

            var result = new Compiler.Compiler(codeFirst).Compile().Check();

            Assert.Empty(result.Errors);
            Assert.True(result.Lexicon.ContainsKey("PersonView"));
            Assert.IsType<ViewNode>(result.Lexicon["PersonView"]);
            var personView = (ViewNode)result.Lexicon["PersonView"];
            Assert.Equal("PersonView", personView.Id);
            Assert.Single(personView.Nodes);
            Assert.Equal(2, personView.Nodes[0].Attributes.Count);

            var title = personView.Nodes[0].GetAttribute("Title");
            Assert.NotNull(title);
            Assert.Equal("Bar", title);

            var render = personView.Nodes[0].GetAttribute("Render");
            Assert.NotNull(render);
            Assert.Equal("False", render);
        }

        [Fact(DisplayName = "Views - Change Interactions")]
        public void Views_ChangeInteractions() {
            var codeFirst = @"
view PersonView = 
    Foo
        Interactions:
            - Bar
        Title: Small Foo
    Bar
        Status: New
       
        

component Foo
component Bar
";

            var result = new Compiler.Compiler(codeFirst).Compile().Check();

            Assert.Empty(result.Errors);
            Assert.True(result.Lexicon.ContainsKey("PersonView"));
            Assert.IsType<ViewNode>(result.Lexicon["PersonView"]);
            var personView = (ViewNode)result.Lexicon["PersonView"];
            Assert.Equal("PersonView", personView.Id);
            Assert.Equal(2, personView.Nodes.Count);
            Assert.Equal(2, personView.Nodes[0].Attributes.Count);

            // test the Foo node
            var fooNode = personView.Nodes[0];
            var interactions = fooNode.GetAttributeItems("Interactions");
            Assert.NotNull(interactions);
            Assert.Single(interactions);

            var title = fooNode.GetAttribute("Title");
            Assert.Equal("Small Foo", title);


            // test the Bar node
            var barNode = personView.Nodes[1];
            var status = barNode.GetAttribute("Status");
            Assert.Equal("New", status);
        }

    }
}
