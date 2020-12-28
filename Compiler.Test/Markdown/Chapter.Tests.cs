using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Markdown {
    public class Chapter {
        [Fact(DisplayName = "Markdown - Chapter Literal")]
        public void TwoWords() {
            var code = @"# Chapter One";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Empty(compilerResult.Errors);

            var chapterOne = compilerResult.Document.First();
            Assert.IsType<MarkdownChapterNode>(chapterOne);

            Assert.Equal("Chapter One", chapterOne.Content);
        }
    }
}
