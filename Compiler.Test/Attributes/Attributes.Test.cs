using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Attributes {
    public class Attributes {
        [Fact(DisplayName = "Attributes - Nested")]
        public void Attributes_Nested() {
            /*
             * DOES NOT WORK YET, NOT SURE IF NESTED COMPONENTS
             * IS A GOOD IDEA. WORK WITH IT
             */


            var code = @"
component Foo =
    Name: Foo
    Server:
        Ip: 0.0.0.0
        Instances:
            - left
            - right
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
        }


        [Fact(DisplayName = "Attributes - Directives")]
        public void Attributes_Directives() {
            var code = @"
component Foo =
    Name: Foo
    Interaction: Bar
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Ast);
            Assert.IsType<ComponentNode>(compilerResult.Ast.First());
            var foo = (AttributesNode)compilerResult.Ast.First();
            Assert.Equal(2, foo.Attributes.Count);
            
            Assert.Empty(compilerResult.Errors);
        }


    }
}


