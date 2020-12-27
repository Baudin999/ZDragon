using Compiler;
using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Imports {
    public class Open {
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
            var compilerFirst = new Compiler.Compiler(codeFirst);
            var compilerResultFirst = compilerFirst.Compile();
            cache.Add("Address", compilerResultFirst);

            var compilerSecond = new Compiler.Compiler(codeSecond);
            var compilerResultSecond = compilerSecond.Compile();
            cache.Add("Person", compilerResultSecond);

            Assert.NotNull(compilerResultFirst);
            Assert.NotNull(compilerResultSecond);

            Assert.Empty(errorSink.Errors);
        }

        [Fact(DisplayName = "Open - Simple")]
        public void Open_Simple() {
            var code = @"
open Address
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<OpenNode>(compilerResult.Ast.First());

            var open = (OpenNode)compilerResult.Ast.First();
            Assert.Equal("Address", open.Id);
        }

        [Fact(DisplayName = "Open - References")]
        public void Open_References() {
            var errorSink = new ErrorSink();
            var cache = new CompilationCache(errorSink);

            new Compiler.Compiler("record Address;", "Helpers.Address", cache).Compile();
            new Compiler.Compiler("type FirstName = String;", "Names", cache).Compile();
            var code = @"
open Helpers.Address;
record Person =
    FirstName: Names.FirstName;
    Address: Address;
";
            new Compiler.Compiler(code, "Person", cache).Compile();
            var compilerResult = cache.Get("Person");

            cache.TypeCheck();

            Assert.Equal(3, cache.Count());
            Assert.Equal(2, compilerResult.Ast.Count);
            Assert.Empty(errorSink.Errors);
        }

    }
}
