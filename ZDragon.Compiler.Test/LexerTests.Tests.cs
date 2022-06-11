namespace ZDragon.Compiler.Test;

public class LexerTests
{
    [Fact]
    public void CanInstatiateLexer()
    {
        var code = @"
# Chapter One

This is a Paragraph, here we can write all the 
documentation that we'll ever want.

@ This is an annotation
record Person =
    FirstName: String;

Some extra documentation

view MyView =
    Controller
    Model
    View

@ An annotation
@ Another annotation
component Controller
component Model
component View

";
        
        
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        
        Assert.NotNull(result);
        Assert.Equal(62, result.Count);
    }

    [Fact]
    public void ValidateTheIndexes()
    {
        var code = @"
# Chapter One

This is a Paragraph, here we can write all the 
documentation that we'll ever want.

@ This is an annotation
record Person =
    FirstName: String;

Some extra documentation

view MyView =
    Controller
    Model
    View

@ An annotation
@ Another annotation
component Controller
component Model
component View

";

        var lines = code.Split(Environment.NewLine);
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        
        Assert.NotNull(result);

        foreach (var token in result)
        {
            // new lines mess up the check because the split has removed the newlines.
            // also, do not check the BeginContext and EndContext
            if (token == TokenType.NewLine ||
                token == TokenType.BeginContext ||
                token == TokenType.EndContext) continue;
            
            var line = lines[token.LineStart];
            var value = line.Substring(token.WordStart, token.Text.Length);
            
            Assert.Equal(token.Text, value);
            Assert.Equal(token.Text.Length, token.WordEnd - token.WordStart);
        }
        
    }
}