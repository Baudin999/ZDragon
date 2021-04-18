
using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Hydration {
    public class AttributesHydration {
        [Fact(DisplayName = "Component - Simple")]
        public void Component_Simple() {
            var code = @"
component Foo
".Trim();
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ComponentNode>(compilerResult.Ast.First());

            var foo = (ComponentNode)compilerResult.Ast.First();

            var text = foo.Hydrate();
            Assert.Equal(code, text);
        }


        [Fact(DisplayName = "Component - Simple 002")]
        public void Component_Simple002() {
            var code = @"
@ With attributes
@ over multiple lines
component Foo
".Trim();
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ComponentNode>(compilerResult.Ast.First());

            var foo = (ComponentNode)compilerResult.Ast.First();

            var text = foo.Hydrate();
            Assert.Equal(code, text);
        }

        [Fact(DisplayName = "Component - Simple 003")]
        public void Component_Simple003() {
            var code = @"
@ With attributes
@ over multiple lines
component Foo =
    Title: My Foo
    Description: This is the
        description of the Foo
        component.
".Trim();
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ComponentNode>(compilerResult.Ast.First());

            var foo = (ComponentNode)compilerResult.Ast.First();

            var text = foo.Hydrate();
            Assert.Equal(code, text);
        }


        [Fact(DisplayName = "Component - Simple 004")]
        public void Component_Simple004() {
            var code = @"
component Foo =
    Title: My Foo
    Tags:
        - Foot
        - Head
        - Body
        - Arms
".Trim();
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ComponentNode>(compilerResult.Ast.First());

            var foo = (ComponentNode)compilerResult.Ast.First();
            Assert.Equal(2, foo.Attributes.Count);

            var text = foo.Hydrate();
            Assert.Equal(code, text);
        }


        [Fact(DisplayName = "Component - Simple 005")]
        public void Component_Simple005() {
            var code = @"
system DataLake =
    Name: DataLake
    Description: The component description, this
        can be multiline with indentation based
        syntax rules!
    Contains:
        - Mizumi
        - sFTP
        - AWSGlue
        - NiFi
".Trim();
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<SystemNode>(compilerResult.Ast.First());

            var foo = (SystemNode)compilerResult.Ast.First();

            var text = foo.Hydrate();
            Assert.Equal(code, text);
        }
    }
}
