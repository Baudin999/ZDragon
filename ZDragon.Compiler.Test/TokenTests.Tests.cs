namespace ZDragon.Compiler.Test;

public class TokenTests_Tests
{
    [Fact(DisplayName = "Testing default token")]
    public void TestingDefaultToken()
    {
        var defaultToken = Token.Default;
        Assert.Equal(TokenType.Unknown, defaultToken.TokenType);
        Assert.Equal(0, defaultToken.LineStart);
        Assert.Equal(0, defaultToken.LineEnd);
        Assert.Equal(0, defaultToken.WordStart);
        Assert.Equal(0, defaultToken.WordEnd);
        Assert.Equal("", defaultToken.Text);
    }
    
    [Fact(DisplayName = "Append")]
    public void Append()
    {
        var text = "something";
        var token = new Token(0, 0, 0, text.Length - 1, TokenType.Word, text);
        var text2 = " other";
        var token2 = new Token(0, 0, 0, text2.Length - 1, TokenType.Word, text2);

        var newToken = token.Append(token2);
        Assert.NotNull(newToken);
        Assert.Equal("something other", newToken.Text);
        Assert.Equal(13, newToken.WordEnd);
    }

    [Fact(DisplayName = "Append null")]
    public void AppendNull()
    {
        var text = "something";
        var token = new Token(0, 0, 0, text.Length - 1, TokenType.Word, text);
        
        var newToken = token.Append(null);
        Assert.NotNull(newToken);
        Assert.Equal("something", newToken.Text);
    }
}