using Compiler;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Lexer {
    public class Contextual {

        [Fact]
        public void ContextualLexer() {
            var code = @"

# Chapter one

This is a paragraph
over multiple lines.

data Foo =
    | Bar
    | Barry

Some extra text

record Person extends Foo =
    FirstName: String;
    LastName: String;

component Something =
    Name: Something

    
    Description: This is the 
        description of the items
        for something.
";

            var sourceCode = new SourceCode(code);
            var lexer = new Compiler.Symbols.Lexer(sourceCode, new ErrorSink());
            var tokens = lexer.Tokenize(Compiler.Symbols.ContextType.None);

            Assert.NotNull(tokens);
            Assert.Equal(3, tokens.Where(t => t.Kind == SyntaxKind.StartBlock).Count());
            Assert.Equal(3, tokens.Where(t => t.Kind == SyntaxKind.EndBlock).Count());

        }

        [Fact]
        public void ContextualLexer_Component() {
            var code = @"


component Something =
    Name: Something

    
    Description: This is the 
        description of the items
        for something.
";

            var sourceCode = new SourceCode(code);
            var lexer = new Compiler.Symbols.Lexer(sourceCode, new ErrorSink());
            var tokens = lexer.Tokenize(Compiler.Symbols.ContextType.None);

            Assert.NotNull(tokens);
            Assert.Equal(1, tokens.Where(t => t.Kind == SyntaxKind.StartBlock).Count());
            Assert.Equal(1, tokens.Where(t => t.Kind == SyntaxKind.EndBlock).Count());

        }
    }
}
