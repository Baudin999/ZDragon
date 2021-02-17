using Compiler;
using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Imports {
    public class Open {

        [Fact(DisplayName = "Open - Simple")]
        public void Open_Simple() {
            var code = @"
open Address
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<OpenNode>(compilerResult.Ast.First());

            var open = (OpenNode)compilerResult.Ast.First();
            Assert.Equal("Address", open.Id);
        }

        [Fact(DisplayName = "Imports - Open")]
        public void Imports_Open() {
            var errorSink = new ErrorSink();
            var codeFirst = @"
record Address =
    Street: String;
";
            var codeSecond = @"
open Address;
record Person =
    Address: Address;
";
            var cache = new CompilationCache(errorSink);
            var compilerFirst = new Compiler.Compiler(codeFirst, "Address", cache);
            var compilerResultFirst = compilerFirst.Compile().Check();

            var compilerSecond = new Compiler.Compiler(codeSecond, "Person", cache);
            var compilerResultSecond = compilerSecond.Compile().Check();

            Assert.NotNull(compilerResultFirst);
            Assert.NotNull(compilerResultSecond);

            Assert.Empty(errorSink.Errors);
        }

       

        [Fact(DisplayName = "Open - References")]
        public void Open_References() {
            var errorSink = new ErrorSink();
            var cache = new CompilationCache(errorSink);

            new Compiler.Compiler("record Address;", "Helpers.Address", cache).Compile().Check();
            new Compiler.Compiler("type FirstName = String;", "Names", cache).Compile().Check();
            var code = @"
open Helpers.Address;
record Person =
    FirstName: Names.FirstName;
    Address: Address;
";
            new Compiler.Compiler(code, "Person", cache).Compile().Check();
            var compilerResult = cache.Get("Person");

            cache.TypeCheck();

            Assert.Equal(3, cache.Count());
            Assert.Equal(2, compilerResult.Ast.Count);
            Assert.Empty(errorSink.Errors);
        }

    }
}
