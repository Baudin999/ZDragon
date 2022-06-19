using ZDragon.Compiler.Nodes;

namespace ZDragon.Compiler.Test;

public class ComponentTests
{
    [Fact(DisplayName = "Component Test")]
    public void ComponentTest()
    {
        var code = @"
component Foo =
    Title: Foo
    Description: This is the 
        description of the Foo
        component.
    Version: 0
";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();
        var node = nodes[0];
        var foo = (ComponentNode)node;

        Assert.Single(nodes);
        Assert.Empty(errorSink.Errors);
        Assert.IsType<ComponentNode>(node);
        Assert.Equal("Foo", foo.Id);
        Assert.Equal(3, foo.Fields.Count);
        
        // Test title
        Assert.Equal("Title", foo.Fields[0].Id);
        Assert.Equal("Foo", foo.Fields[0].Content);
        Assert.Equal("Foo", foo.Fields[0].ContentWithoutNewLines);
        
        // test description
        Assert.Equal("Description", foo.Fields[1].Id);
        Assert.Equal($"This is the {Environment.NewLine}description of the Foo{Environment.NewLine}component.", 
            foo.Fields[1].Content);
        Assert.Equal("This is the description of the Foo component.", foo.Fields[1].ContentWithoutNewLines);
    }

    [Fact(DisplayName = "Component should have an identifier")]
    public void ComponentShouldHaveIdentifier()
    {
        var code = "component";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();

        Assert.Single(errorSink.Errors);
        Assert.Empty(nodes);

    }
    
    [Fact(DisplayName = "Fields should have an Identifier")]
    public void FieldsShouldHaveAnIdentifier()
    {
        var code = @"
component Foo =
    title: Something
";
        var errorSink = new ErrorSink();
        var result = new Lexer(errorSink).Lex(code).ToList();
        var nodes = new Parser(result, errorSink).Parse().ToList();

        Assert.Single(errorSink.Errors);
        Assert.Single(nodes);

    }
}