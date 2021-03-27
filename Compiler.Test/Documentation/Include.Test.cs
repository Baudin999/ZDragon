using Compiler;
using System.Linq;
using Xunit;

namespace Documentation {
    public class Include {

        [Fact(DisplayName = "Include - Region")]
        public void Include_Region() {
            var errorSink = new ErrorSink();
            var codeFirst = @"

# A beginning

% region: Foo

This is a paragraph

## subchapter

And another paragraph, in the Foo region

component SkipThis =
    Description: Components and other IIdentifierExpressionNode's should
        be skipped when including a piece of documentation.

% endregion: Foo

And an end

";

            var codeSecond = @"

include Root.Foo;

";
            var cache = new CompilationCache(errorSink);
            var compilerFirst = new Compiler.Compiler(codeFirst, "Root", cache);
            var compilerResultFirst = compilerFirst.Compile().Check();

            var compilerSecond = new Compiler.Compiler(codeSecond, "Sub", cache);
            var compilerResultSecond = compilerSecond.Compile().Check();


            Assert.Equal(3, compilerResultSecond.Document.Count());

        }
    }
}
