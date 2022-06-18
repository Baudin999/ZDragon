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
component Controller =
    @ The Title 
    @ Of the Controller component
    Title: This is the Controller
component Model
component View

";
        
        
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        
        Assert.NotNull(result);
        Assert.Equal(149, result.Count);
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

## Something needs to be done

This is a chapter on how we will make the code work 
for us instead of us working on the code!



";

        var lines = 
            code
                .Split(Environment.NewLine)
                .Select(l => l + Environment.NewLine)
                .ToList();
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        
        Assert.NotNull(result);

        foreach (var token in result)
        {
            // do not check the BeginContext and EndContext
            if (token == TokenType.BeginContext ||
                token == TokenType.EndContext) continue;

            var line = lines[token.LineStart];
            var value = line.Substring(token.WordStart, token.Text.Length);
            
            Assert.Equal(token.Text, value);
            Assert.Equal(token.Text.Length, token.WordEnd - token.WordStart);
        }
        
    }


    [Fact(DisplayName = "Component Context Correct")]
    public void ComponentContextCorrect()
    {
        // The context should wrap the code elements
        var code = @"
component Foo =
    Title: This is the Foo Title
    Description: A Description can
        be spanning multiple lines
        and can have tokens like
        => And 
        Capital letters starting
    Version: 0
";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        
        Assert.NotNull(result);
        
    }
    
    [Fact(DisplayName = "TestTokenEquality")]
    public void TestTokenEquality()
    {
        // The context should wrap the code elements
        var code = @"component";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var kwComponent = result.First();
        
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.True(kwComponent == TokenType.KwComponent);
        Assert.True(kwComponent == "component");
        Assert.True(kwComponent != TokenType.At);
        Assert.True(kwComponent != "brother");
        
        Assert.Equal("KwComponent - 'component'",kwComponent.ToString());

    }

    [Fact(DisplayName = "Lex newline with \\n\\r")]
    public void TestNewLine1()
    {
        var code = "\n\r";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var newLineToken = result.First();
        
        Assert.Single(result);
        Assert.NotNull(newLineToken);
    }
    
    [Fact(DisplayName = "Lex four spaces as Indent")]
    public void LexFourSpacesAsIndent()
    {
        var code = "    ";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var indentToken = result.First();
        
        Assert.Single(result);
        Assert.NotNull(indentToken);
        Assert.Equal("    ", indentToken.Text);
    }
    
    [Fact(DisplayName = "Lex tab \\t as Indent")]
    public void LexTabAsIndent()
    {
        var code = "\t";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var indentToken = result.First();
        
        Assert.Single(result);
        Assert.NotNull(indentToken);
        Assert.Equal("\t", indentToken.Text);
    }
}