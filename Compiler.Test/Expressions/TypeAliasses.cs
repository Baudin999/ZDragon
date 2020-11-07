using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class TypeAliasses {
        [Fact(DisplayName = "Expression - variable type definition")]
        public void Expression_VariableDefinition() {
            var code = @"
type name :: string;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            TypeAliasNode typeNode = (TypeAliasNode)compilerResult.Ast.First();
            Assert.IsType<IdentifierNode>(typeNode.Body);
        }

        [Fact(DisplayName = "Expression - function definition")]
        public void Expression_FunctionDefinition() {
            var code = @"
type add :: number -> number -> number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            Assert.Equal(3, ((FunctionParameterNode)((TypeAliasNode)compilerResult.Ast.First()).Body).Nodes.Count);

            var d = (dynamic)compilerResult.Ast.First();
            Assert.Equal("number", ((dynamic)compilerResult.Ast.First()).Body.Nodes[0].Id.value);
            Assert.Equal("number", ((dynamic)compilerResult.Ast.First()).Body.Nodes[1].Id.value);
            Assert.Equal("number", ((dynamic)compilerResult.Ast.First()).Body.Nodes[2].Id.value);
        }

        [Fact(DisplayName = "Expression - function parameters")]
        public void Expression_FunctionParameters() {
            var code = @"
type add :: (number -> number -> number) -> (number -> string) -> (number1 -> (number2 -> number3));
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            TypeAliasNode typeNode = (TypeAliasNode)compilerResult.Ast.First();
            Assert.IsType<FunctionParameterNode>(typeNode.Body);
            var body = (FunctionParameterNode)typeNode.Body;
            Assert.Equal(3, body.Nodes.Count);

            // first
            // (number -> number -> number)
            Assert.IsType<FunctionParameterNode>(body.Nodes.First());
            var first = (FunctionParameterNode)body.Nodes.First();
            Assert.Equal(3, first.Nodes.Count);
            Assert.IsType<IdentifierNode>(first.Nodes.First());
            Assert.Equal("number", ((IdentifierNode)first.Nodes.First()).Id.value);
            Assert.IsType<IdentifierNode>(first.Nodes.Last());
            Assert.Equal("number", ((IdentifierNode)first.Nodes.Last()).Id.value);


            // second
            // (number -> string)
            Assert.IsType<FunctionParameterNode>(body.Nodes[1]);
            var second = (FunctionParameterNode)body.Nodes[1];
            Assert.Equal(2, second.Nodes.Count);
            Assert.IsType<IdentifierNode>(second.Nodes.First());
            Assert.Equal("number", ((IdentifierNode)second.Nodes.First()).Id.value);
            Assert.IsType<IdentifierNode>(second.Nodes.Last());
            Assert.Equal("string", ((IdentifierNode)second.Nodes.Last()).Id.value);

            // second
            // (number1 -> (number2 -> number3))
            Assert.IsType<FunctionParameterNode>(body.Nodes.First());
            var third = (FunctionParameterNode)body.Nodes.Last();
            Assert.Equal(2, third.Nodes.Count);
            Assert.IsType<IdentifierNode>(third.Nodes.First());
            Assert.Equal("number1", ((IdentifierNode)third.Nodes.First()).Id.value);

            Assert.IsType<FunctionParameterNode>(third.Nodes.Last());
            var thirdLast = (FunctionParameterNode)third.Nodes.Last();
            Assert.Equal(2, thirdLast.Nodes.Count);
            Assert.Equal("number2", ((IdentifierNode)thirdLast.Nodes.First()).Id.value);
            Assert.Equal("number3", ((IdentifierNode)thirdLast.Nodes.Last()).Id.value);
        }
    }
}
