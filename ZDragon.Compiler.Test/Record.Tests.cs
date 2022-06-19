using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Test;

public class RecordTest
{
    [Fact(DisplayName = "Simple Record Test")]
    public void SimpleRecordTest()
    {
        var code = @"
record Person =
    FirstName: String;
";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();
        var node = nodes[0];
        var foo = (RecordNode)node;

        Assert.Single(nodes);
        Assert.Empty(errorSink.Errors);
        Assert.IsType<RecordNode>(node);
        Assert.Equal("Person", foo.Id);

        var firstNameField = foo.Fields[0];
        Assert.Equal("FirstName", firstNameField.Id);
        Assert.Equal("String", firstNameField.Type.ToString());
    }
    
    [Fact(DisplayName = "Invalid field id")]
    public void InvalidFieldId()
    {
        var code = @"
record Person =
    firstName: String;
";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();
        var node = nodes[0];
        var person = (RecordNode)node;

        Assert.Single(nodes);
        Assert.Single(errorSink.Errors);
        Assert.IsType<RecordNode>(node);
        Assert.Equal("Person", person.Id);
    }
    
    [Fact(DisplayName = "Invalid field type")]
    public void InvalidFieldType()
    {
        var code = @"
record Person =
    FirstName: string;
";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();
        var node = nodes[0];
        var person = (RecordNode)node;

        Assert.Single(nodes);
        Assert.Empty(errorSink.Errors);
        Assert.IsType<RecordNode>(node);
        Assert.Equal("Person", person.Id);
        Assert.Empty(person.Fields);
    }
}