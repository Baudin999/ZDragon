using Compiler;
using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Architecture {
    public class Interaction {
        [Fact(DisplayName = "Interaction - Simple")]
        public void Interaction_Simple() {
            var code = @"

component FromComponent

interaction FromTo =
    From: FromComponent
    To: ToComponent

component ToComponent

";
            var compilerResult = new Compiler.Compiler(code).Compile().Check();

            Assert.Empty(compilerResult.Errors);

        }

        [Fact(DisplayName = "Interaction - Import Components")]
        public void Interaction_ImportComponents() {
            var errorSink = new ErrorSink();
            var codeFirst = @"
component FromComponent
component ToComponent
";
            var codeSecond = @"
open BaseComponents;

interaction FromTo =
    From: FromComponent
    To: ToComponent
";
            var cache = new CompilationCache(errorSink);
            var compilerResultFirst = new Compiler.Compiler(codeFirst, "BaseComponents", cache).Compile().Check();
            var compilerResultSecond = new Compiler.Compiler(codeSecond, "Components", cache).Compile().Check();

            Assert.NotNull(compilerResultFirst);
            Assert.NotNull(compilerResultSecond);

            Assert.Empty(errorSink.Errors);
            Assert.Equal(3, compilerResultSecond.Lexicon.Count);


        }



        /// <summary>
        /// THIS TEST NEEDS TO BE REVISED, EMPTY LINES SHOULD BE POSSIBLE!!!
        /// </summary>
        [Fact(DisplayName = "Interaction - Empty lines")]
        public void Interaction_EmptyLines() {
            var code = @"

component FromComponent
component ToComponent

interaction FromTo =
    From: FromComponent
    To: ToComponent
    Title: My interaction
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.Equal(3, compilerResult.Lexicon.Count);

            var interaction = (AttributesNode)compilerResult.Lexicon["FromTo"];
            Assert.Equal(3, interaction.Attributes.Count);
        }


        [Fact(DisplayName = "Interaction - Type Errors 001")]
        public void Interaction_TypeErrors001() {
            var code = @"
interaction FromTo =
    From: GetDataFromToComponent
    To: ToComponent
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(2, compilerResult.Errors.Count);

        }
    }
}



