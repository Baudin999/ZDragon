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
        var lexer = new Lexer(errorSink);
        var result = lexer.Lex(code).ToList();
        
        Assert.NotNull(result);

        foreach (var token in result)
        {
            var line = lines[token.LineStart];
            var value = line.Substring(token.WordStart, token.Text.Length);
            
            Assert.Equal(token.Text, value);
            Assert.Equal(token.Text.Length, token.WordEnd - token.WordStart);
        }
        
        Assert.Empty(lexer.Errors);
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

    [Fact(DisplayName = "Lex all operators")]
    public void LexCharacters()
    {
        var code = @"!@#$%^&*()_+-=,.<>;:'""[]{}/\";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        Assert.Equal(28, result.Count);
        
    }
    
    [Fact(DisplayName = "Lex integer")]
    public void LexInteger()
    {
        var code = @"110";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        Assert.Single(result);
        Assert.Equal("110", result[0].Text);
        Assert.Equal(TokenType.Number, result[0].TokenType);
    }
    
    [Fact(DisplayName = "Lex decimal")]
    public void LexDecimal()
    {
        var code = @"110.99";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        Assert.Single(result);
        Assert.Equal("110.99", result[0].Text);
        Assert.Equal(TokenType.Number, result[0].TokenType);
    }
    
    [Fact(DisplayName = "Lex keywords")]
    public void LexKeywords()
    {
        var code = @"
component
system
endpoint
flow
view
record
choice
data
type
extends
";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code);
        var resultWithoutNewlines = result.Where(r => r != TokenType.NewLine).ToList();
        
        Assert.Equal(TokenType.KwComponent, resultWithoutNewlines[0].TokenType);
        Assert.Equal(TokenType.KwSystem, resultWithoutNewlines[1].TokenType);
        Assert.Equal(TokenType.KwEndpoint, resultWithoutNewlines[2].TokenType);
        Assert.Equal(TokenType.KwFlow, resultWithoutNewlines[3].TokenType);
        Assert.Equal(TokenType.KwView, resultWithoutNewlines[4].TokenType);
        Assert.Equal(TokenType.KwRecord, resultWithoutNewlines[5].TokenType);
        Assert.Equal(TokenType.KwChoice, resultWithoutNewlines[6].TokenType);
        Assert.Equal(TokenType.KwData, resultWithoutNewlines[7].TokenType);
        Assert.Equal(TokenType.KwType, resultWithoutNewlines[8].TokenType);
        Assert.Equal(TokenType.KwExtends, resultWithoutNewlines[9].TokenType);
    }
    
    [Fact(DisplayName = "Unknown character")]
    public void LexUnknownCharacter()
    {
        var code = $"{char.ConvertFromUtf32(0x0000008a)}";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        Assert.Single(errorSink.Errors);
    }
}