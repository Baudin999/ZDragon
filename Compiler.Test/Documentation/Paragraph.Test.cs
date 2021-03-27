using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Documentation {
    public class Paragraph {
        [Fact(DisplayName = "Markdown - Paragraph Literal")]
        public void Markdown_ParagraphLiteral() {
            var code = @"
This is a paragraph.
";
            var result = new Compiler.Compiler(code).Compile().Check();

            Assert.Single(result.Tokens);
            Assert.Single(result.Ast);
            Assert.Empty(result.Lexicon);
            Assert.Empty(result.Errors);

            var paragraph = result.Document.First();
            Assert.IsType<MarkdownNode>(paragraph);

            Assert.Equal("This is a paragraph.", paragraph.Content);
            Assert.Equal("This is a paragraph." + System.Environment.NewLine, paragraph.Literal);
        }


        [Fact(DisplayName = "Markdown - Interpolation 01")]
        public void Markdown_Interpolation01() {
            var code = @"
This is a paragraph about {Foo.Name} {Foo.Version}.

component Foo =
    Name: Foo
    Version: v0
    Description: This is the 
        description of the Foo component.
";
            var result = new Compiler.Compiler(code).Compile().Check();

            var paragraph = (MarkdownNode)result.Document.First();
            Assert.IsType<MarkdownNode>(paragraph);

            var value = paragraph.Interpolate(result.Lexicon);
            Assert.Equal("This is a paragraph about Foo v0.", value);
        }


        [Fact(DisplayName = "Markdown - Interpolation 02")]
        public void Markdown_Interpolation02() {
            var code = @"

{Foo.Description}

component Foo =
    Name: Foo
    Version: v0
    Description: This is the 
        description of the Foo component.
";
            var result = new Compiler.Compiler(code).Compile().Check();

            var paragraph = (MarkdownNode)result.Document.First();
            Assert.IsType<MarkdownNode>(paragraph);

            var value = paragraph.Interpolate(result.Lexicon);
            Assert.Equal($"This is the{System.Environment.NewLine}description of the Foo component.", value);
        }
    }
}
 