using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Test;

public class ParserTests
{
    [Fact(DisplayName = "Parse Component")]
    public void ParseComponent()
    {
        var code = @"
component Foo
";
        
        
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();
        var foo = (ComponentNode)nodes.First();
        
        Assert.NotNull(nodes);
        Assert.Single(nodes);
        Assert.NotNull(foo);
        Assert.Equal("Foo", foo.Id);
    }
    
    [Fact(DisplayName = "Parse Record")]
    public void ParseRecord()
    {
        var code = @"
record Person
";
        
        
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();
        var person = (RecordNode)nodes.First();
        
        Assert.NotNull(nodes);
        Assert.Single(nodes);
        Assert.NotNull(person);
        Assert.Equal("Person", person.Id);
        Assert.Empty(person.Fields);
    }
    
    [Fact(DisplayName = "Identifier does not start with capital letter")]
    public void IdentifierDoesNotStartWithCapitalLetter()
    {
        var code = @"
record person
";
        
        
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();


        Assert.Single(errorSink.Errors);
    }
    
    [Fact(DisplayName = "No Identifier")]
    public void NoIdentifier()
    {
        var code = @"
record
";
        
        
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();


        Assert.Single(errorSink.Errors);
    }
    

}