using Compiler;
using Compiler.Language.Nodes;
using Xunit;

namespace Lexicon {
    public class Lexicon {

        [Fact(DisplayName = "Lexicon - Default")]
        public void Lexicon_Default() {
            var errorSink = new ErrorSink();
            var codeFirst = @"
# Chapter

This is an paragraph

record Address =
    Street: Street;
record Person =
    Address: Address;

component Component001 =
    Name: Component 001

And some more info.
@ another type
type Street = String;
";

            var cache = new CompilationCache(errorSink);
            var compilerFirst = new Compiler.Compiler(codeFirst, "Address", cache).Compile().Check();

            Assert.Empty(cache.Errors);

            Assert.Equal(7, compilerFirst.Ast.Count);
            Assert.Equal(4, compilerFirst.Lexicon.Count);

            var languageIndex = cache.LanguageNodes;
            Assert.Equal(3, languageIndex.Count);

            var componentIndex = cache.ArchitectureNodes;
            Assert.Single(componentIndex);
        }

        [Fact(DisplayName = "Lexicon - Default 002")]
        public void Lexicon_Default_002() {
            var codeFirst = @"
# Chapter

This is an paragraph

record Address =
    Street: Street;
record Person =
    Address: Address;

component Component001 =
    Name: Component 001

And some more info.

type Street = String;
";

            var compilerFirst = new Compiler.Compiler(codeFirst).Compile().Check();
            Assert.Empty(compilerFirst.Errors);
            Assert.Equal(7, compilerFirst.Ast.Count);
        }

        [Fact(DisplayName = "Lexicon - Build an Index")]
        public void Lexicon_BuildAnIndex() {
            var errorSink = new ErrorSink();
            var codeFirst = @"
record Address =
    Street: String;
";

            var cache = new CompilationCache(errorSink);
            var compilerFirst = new Compiler.Compiler(codeFirst, "Address", cache).Compile().Check();
            

            // Test the language indexation
            var languageIndex = cache.GenerateLanguageIndex("Address", "Person");
            Assert.Single(languageIndex);

            var personItem = languageIndex.Find(i => i.Key == "Person");
            Assert.Null(personItem);
            

            var addressItem = languageIndex.Find(i => i.Key == "Address");
            Assert.NotNull(addressItem);
            if (addressItem != null) {
                Assert.Equal("Address.Address", addressItem.QualifiedName);
                Assert.Equal("Address", addressItem.Key);
            }

        }

        [Fact(DisplayName = "Lexicon - Contain all")]
        public void Imports_Open() {
            var errorSink = new ErrorSink();
            var codeFirst = @"
record Address =
    Street: String;

endpoint ApiGateway =
    Name: Api Gateway
";
            var codeSecond = @"
open Address;
record Person =
    Address: Address;

component Database =
    Type: Database
";
            var cache = new CompilationCache(errorSink);
            var compilerFirst = new Compiler.Compiler(codeFirst, "Address", cache);
            var compilerResultFirst = compilerFirst.Compile().Check();

            var compilerSecond = new Compiler.Compiler(codeSecond, "Person", cache);
            var compilerResultSecond = compilerSecond.Compile().Check();

            Assert.NotNull(compilerResultFirst);
            Assert.NotNull(compilerResultSecond);

            Assert.Empty(errorSink.Errors);

            var componentIndex = cache.GenerateComponentIndex("Address", "Person");
            Assert.Equal(2, componentIndex.Count);


            // Test the language indexation
            var languageIndex = cache.GenerateLanguageIndex("Address", "Person");
            Assert.Equal(2, languageIndex.Count);

            var personItem = languageIndex.Find(i => i.Key ==  "Person");
            Assert.NotNull(personItem);
            if (personItem != null) {
                Assert.Equal("Person.Person", personItem.QualifiedName);
                Assert.Equal("Person", personItem.Key);
            }

            var addressItem = languageIndex.Find(i => i.Key == "Address");
            Assert.NotNull(addressItem);
            if (addressItem != null) {
                Assert.Equal("Address.Address", addressItem.QualifiedName);
                Assert.Equal("Address", addressItem.Key);
            }

        }
    }
}
