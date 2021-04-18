using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Hydration {
    public class ChoiceHydration {

        [Fact(DisplayName = "Choice - Gender")]
        public void Choice_Gender() {
            var code = @"
choice Gender =
    | ""Male""
    | ""Female""
    | ""Non Binary""
".Trim();
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ChoiceNode>(compilerResult.Ast.First());

            var gender = (ChoiceNode)compilerResult.Ast.First();

            var text = gender.Hydrate();
            Assert.Equal(code, text);
        }

        [Fact(DisplayName = "Choice - Annotated Gender")]
        public void Choice_AnnotatedGender() {
            var code = @"
choice Gender =
    | ""Male""
    | ""Female""
    @ Go Change!!
    | ""Non Binary""
".Trim();
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ChoiceNode>(compilerResult.Ast.First());

            var gender = (ChoiceNode)compilerResult.Ast.First();

            var text = gender.Hydrate();
            Assert.Equal(code, text);
        }

        [Fact(DisplayName = "Choice - Lots of annotations")]
        public void Choice_LotsOfAnnotations() {
            var code = @"
@ The gender choice
@ use this sparingly
@ throughout the application
choice Gender =
    | ""Male""
    @ A female
    @ gender
    | ""Female""
    @ Go Change!!
    | ""Non Binary""
".Trim();
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<ChoiceNode>(compilerResult.Ast.First());

            var gender = (ChoiceNode)compilerResult.Ast.First();

            var text = gender.Hydrate().Trim();
            Assert.Equal(code.Trim(), text);
        }
    }
}
