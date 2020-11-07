using Compiler;
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
        private void verifyTokens(SourceCode sourceCode, List<Token> tokens, bool show = false)
        {
            var lines = sourceCode.Code.Split('\n').Select(s => s + "\n").ToArray();
            tokens
                .ForEach(p =>
                {
                    if (p.kind == SyntaxKind.EndBlock) return;

                    if (p.lineStart == p.lineEnd) {
                        var val = p.value;
                        var snippet = sourceCode.Code[p.indexStart..p.indexEnd];
                        var equals = val == snippet;

                        var lineSnippet = lines[p.lineStart][p.columnStart..p.columnEnd];
                        var lineEqual = val == lineSnippet;// lineSnippet;

                        if (show) {
                            Log($"({val}) -> ({snippet})({lineSnippet})");
                        }

                        Assert.True(equals, $"1: Token is '{p.value}' but range in text results in '{snippet}'");
                        Assert.True(lineEqual, $"2: Token is '{p.value}' but range in line results in '{lineSnippet}'");
                        Assert.True(p.kind != SyntaxKind.Unknown, $"Unknown token found with value: '{p.value}'");
                    }
                    else if (p.lineStart < p.lineEnd) {
                        // if multiline
                        var val = p.value;

                        var snippet = sourceCode.Code[p.indexStart..p.indexEnd];
                        var equals = val == snippet;

                        var _lns = lines[p.lineStart..(p.lineEnd + 1)];
                        var _str = string.Join("", _lns);
                        var lineSnippet = _str[p.columnStart..^(lines[p.lineEnd].Length - p.columnEnd)];
                        var lineEqual = val == lineSnippet;

                        Assert.True(equals, $"1: Token is '{p.value}' but range in text results in '{snippet}'");
                        Assert.True(lineEqual, $"2: Token is '{p.value}' but range in line results in '{lineSnippet}'");
                        Assert.True(p.kind != SyntaxKind.Unknown, $"Unknown token found with value: '{p.value}'");
                    }
                });
        }

        [Fact(DisplayName ="Lex Lambda Token")]
        public void LambdaSymbolParser() {
            var code = @"=>";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile(ContextType.FunctionDef);


            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);

            Assert.Single(compilerResult.Tokens);
            Assert.True(compilerResult.Tokens.First().kind == SyntaxKind.LambdaToken);
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

            Assert.True(compilerResult.Tokens.Count() == 2);
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

            var tokens = compilerResult.Tokens.ToList();
            Assert.True(tokens.Count == 3);
            
            var p0 = tokens[0];
            var p1 = tokens[1];
            var p2 = tokens[2];
            Assert.Equal("a", p0.value);
            Assert.Equal("'", p1.value);
            Assert.Equal("b", p2.value);
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

            Assert.True(compilerResult.Tokens.Count() == 2);
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

            Assert.True(compilerResult.Tokens.Count() > 1);
        }

        [Fact(DisplayName = "Lex String")]
        public void LexString() {
            var code = @"""Peter""";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();


            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);
            Assert.Single(compilerResult.Tokens);
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
        }

        [Fact(DisplayName = "Lex Indent - Multiple Indents")]
        public void LexMultipleIndentations() {
            var code = @"
stringCombine :: string -> string -> string
stringCombine s1 s2 =>
    ""{s1} {s2}""
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            verifyTokens(
                compiler.SourceCode,
                compilerResult.Tokens.ToList(),
                false);

            Assert.True(compilerResult.Tokens.Count() > 10);
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

            Assert.True(compilerResult.Tokens.Count() > 10);
        }

        [Fact(DisplayName = "Lex Large Example")]
        public void BiggerExample() {
            var code = @"

alias add = Number -> Number -> Number;
let add x y => x + y;

type extra = String;
let extra = ""ghij""


type stringCombine = string -> string -> string;
let stringCombine s1 s2 =>
    ""{s1} {s2}"";

type bar = () -> string
let bar () =>
    concat ""ab"" other another extra;
    where
        let other = ""c"";
        let another = ""def"";

{{

# Markdown documentation

Inside this documentation you can write
stuff you'll need. CarLang is automatically
outputting your documenation for you.

}}

let main () =>
    bar();
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
            Assert.True(compilerResult.Tokens.Count() > 10);
        }

        public Lexer(ITestOutputHelper output) : base(output) { }
    }
}
