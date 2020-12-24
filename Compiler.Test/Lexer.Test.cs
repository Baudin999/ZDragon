using Compiler;
using Compiler.Language.Nodes;
using Compiler.Symbols;
using Compiler.Test;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Xunit.Abstractions;

namespace Lexer {
    public class Lexer : BaseTest
    {

        /// <summary>
        /// For each of the tokens and with the source code this function checks if
        /// the snippet from the source code is equal to the value in the Token. This
        /// verifies the validity of each token.
        /// </summary>
        /// <param name="sourceCode">The Source code</param>
        /// <param name="tokens">A list of tokens to check</param>
        /// <param name="show">Print the check to the console</param>
        private void verifyTokens(SourceCode sourceCode, List<TokenGroup> tokenBlocks, bool show = false)
        {

            var tokens = tokenBlocks.SelectMany(t => t.Tokens).ToList();
            var lines = sourceCode.Code.Split('\n').Select(s => s + "\n").ToArray();
            tokens
                .ForEach(p =>
                {
                    if (p.Kind == SyntaxKind.EndBlock) return;

                    if (p.LineStart == p.LineEnd) {
                        var val = p.Value;
                        var snippet = sourceCode.Code[p.IndexStart..p.IndexEnd];
                        var equals = val == snippet;

                        var lineSnippet = lines[p.LineStart][p.ColumnStart..p.ColumnEnd];
                        var lineEqual = val == lineSnippet;// lineSnippet;

                        if (show) {
                            Log($"({val}) -> ({snippet})({lineSnippet})");
                        }

                        Assert.True(equals, $"1: Token is '{p.Value}' but range in text results in '{snippet}'");
                        Assert.True(lineEqual, $"2: Token is '{p.Value}' but range in line results in '{lineSnippet}'");
                        Assert.True(p.Kind != SyntaxKind.Unknown, $"Unknown token found with value: '{p.Value}'");
                    }
                    else if (p.LineStart < p.LineEnd) {
                        // if multiline
                        var val = p.Value;

                        var snippet = sourceCode.Code[p.IndexStart..p.IndexEnd];
                        var equals = val == snippet;

                        var _lns = lines[p.LineStart..(p.LineEnd + 1)];
                        var _str = string.Join("", _lns);
                        var lineSnippet = _str[p.ColumnStart..^(lines[p.LineEnd].Length - p.ColumnEnd)];
                        var lineEqual = val == lineSnippet;

                        Assert.True(equals, $"1: Token is '{p.Value}' but range in text results in '{snippet}'");
                        Assert.True(lineEqual, $"2: Token is '{p.Value}' but range in line results in '{lineSnippet}'");
                        Assert.True(p.Kind != SyntaxKind.Unknown, $"Unknown token found with value: '{p.Value}'");
                    }
                });
        }


        [Fact(DisplayName = "Lex - Two Words")]
        public void TwoWords() {
            var code = @"two words";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Equal(ContextType.MarkdownDeclaration, compilerResult.Tokens.First().Context);
            Assert.Equal(code, ((MarkdownNode)compilerResult.Ast[0]).Markdown);
        }


        [Fact(DisplayName = "Lex Parameter - Non Contextual Generic Parameter")]
        public void NonContextualGenericParameter() {
            var code = @"a 'b";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();


            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Equal(ContextType.MarkdownDeclaration, compilerResult.Tokens.First().Context);
            Assert.Equal(code, ((MarkdownNode)compilerResult.Ast[0]).Markdown);
        }


        [Fact(DisplayName = "Lex - Word on new line")]
        public void WordOnNewLine() {
            var code = @"
Peter";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();


            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Equal(ContextType.MarkdownDeclaration, compilerResult.Tokens.First().Context);
            Assert.Equal(code.Trim(), ((MarkdownNode)compilerResult.Ast[0]).Markdown);
        }

        [Fact]
        public void SimpleTypeDeclaration()
        {
            var code = @"
add x y => x + y;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

  
            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Equal(ContextType.MarkdownDeclaration, compilerResult.Tokens.First().Context);
            Assert.Equal(code.Trim(), ((MarkdownNode)compilerResult.Ast[0]).Markdown);
        }

        [Fact(DisplayName = "Lex - String Literal")]
        public void LexString() {
            var code = @"""Peter""";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();


            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);
            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Equal(ContextType.MarkdownDeclaration, compilerResult.Tokens.First().Context);
            Assert.Equal(code, ((MarkdownNode)compilerResult.Ast[0]).Markdown);
        }

        [Fact(DisplayName = "Lex String - Multiline")]
        public void LexStringMultiline() {
            var code = @"""Peter
Pan""";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Equal(ContextType.MarkdownDeclaration, compilerResult.Tokens.First().Context);
            Assert.Equal(code, ((MarkdownNode)compilerResult.Ast[0]).Markdown);
        }


        [Fact(DisplayName = "Lex markup - Markup Example")]
        public void LexMarkup() {
            var code = @"
<div>
    <h1>Heading</h1>
    <p>
        This is a paragraph
    </p>
</div>
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);

            Assert.Single(compilerResult.Tokens);
            Assert.Single(compilerResult.Ast);
            Assert.Equal(ContextType.MarkupDeclaration, compilerResult.Tokens.First().Context);
            //Assert.Equal(code.Trim(), ((MarkupNode)compilerResult.Ast[0]).Markdown);
        }

        [Fact(DisplayName = "Lex - Large Example")]
        public void Lex_LargeExample() {
            var code = @"

type add = Number -> Number -> Number;
type stringCombine = string -> string -> string;

";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();


            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);

            Assert.True(compilerResult.Tokens.Count() > 1);
        }

        [Fact(DisplayName = "Lex Type Definition")]
        public void ParseType() {
            var code = @"

@ The person type
@ extends the Mammal
type Person 'a 'b extends Mammal =

    FirstName: Name;

    @ The last name
    LastName: Maybe Name;

    Age: Number
        & min 0
        @ might have to be larger
        & max 100;

alias Name = String;

type perterPan = Person;
let peterPan = Person {
    FirstName = ""Peter"",
    LastName = ""Pan"",
    Age = 18
};

{* Listening for changes is also easy: *}
bind peterPan >> old new event => 
    print new;

bind peterPan.Age >> oldAge newAge oldObject newObject event => 
    print ""The old age was: {oldAge}, the new age is: {newAge}.""

bind::onChange peterPan.Age >> ...params => 
    print ""Age changed"";

";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();
            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);
            Assert.True(compilerResult.Tokens.Count() > 1);
        }

        public Lexer(ITestOutputHelper output) : base(output) { }
    }
}
