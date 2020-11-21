using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Expressions {
    public class TypeAliasses {
        [Fact(DisplayName = "Expression - variable type definition")]
        public void Expression_VariableDefinition() {
            var code = @"
type name = string;
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
type add = number -> number -> number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.True(compilerResult.Ast.Count == 1);
            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            Assert.Equal(3, ((FunctionParameterNode)((TypeAliasNode)compilerResult.Ast.First()).Body).Nodes.Count);

            var d = (dynamic)compilerResult.Ast.First();
            Assert.Equal("number", ((dynamic)compilerResult.Ast.First()).Body.Nodes[0].Id.Value);
            Assert.Equal("number", ((dynamic)compilerResult.Ast.First()).Body.Nodes[1].Id.Value);
            Assert.Equal("number", ((dynamic)compilerResult.Ast.First()).Body.Nodes[2].Id.Value);
        }

        [Fact(DisplayName = "Expression - function parameters")]
        public void Expression_FunctionParameters() {
            var code = @"
type add = (number -> number -> number) -> (number -> string) -> (number1 -> (number2 -> number3));
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
            Assert.Equal("number", ((IdentifierNode)first.Nodes.First()).Id.Value);
            Assert.IsType<IdentifierNode>(first.Nodes.Last());
            Assert.Equal("number", ((IdentifierNode)first.Nodes.Last()).Id.Value);


            // second
            // (number -> string)
            Assert.IsType<FunctionParameterNode>(body.Nodes[1]);
            var second = (FunctionParameterNode)body.Nodes[1];
            Assert.Equal(2, second.Nodes.Count);
            Assert.IsType<IdentifierNode>(second.Nodes.First());
            Assert.Equal("number", ((IdentifierNode)second.Nodes.First()).Id.Value);
            Assert.IsType<IdentifierNode>(second.Nodes.Last());
            Assert.Equal("string", ((IdentifierNode)second.Nodes.Last()).Id.Value);

            // second
            // (number1 -> (number2 -> number3))
            Assert.IsType<FunctionParameterNode>(body.Nodes.First());
            var third = (FunctionParameterNode)body.Nodes.Last();
            Assert.Equal(2, third.Nodes.Count);
            Assert.IsType<IdentifierNode>(third.Nodes.First());
            Assert.Equal("number1", ((IdentifierNode)third.Nodes.First()).Id.Value);

            Assert.IsType<FunctionParameterNode>(third.Nodes.Last());
            var thirdLast = (FunctionParameterNode)third.Nodes.Last();
            Assert.Equal(2, thirdLast.Nodes.Count);
            Assert.Equal("number2", ((IdentifierNode)thirdLast.Nodes.First()).Id.Value);
            Assert.Equal("number3", ((IdentifierNode)thirdLast.Nodes.Last()).Id.Value);
        }

        [Fact(DisplayName = "Expression - generic function definition")]
        public void Expression_GenericFunctionDefinition() {
            var code = @"
type add 'a 'b = 'a -> 'b -> number;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.True(compilerResult.Ast.Count == 1);

            Assert.IsType<TypeAliasNode>(compilerResult.Ast.First());
            TypeAliasNode typeNode = (TypeAliasNode)compilerResult.Ast.First();
            Assert.Equal("add", typeNode.Id.Value);
            Assert.Equal(2, typeNode.GenericParameters.Count());
            Assert.Equal("'a", typeNode.GenericParameters.First().Value);
            Assert.Equal("'b", typeNode.GenericParameters.Last().Value);

            Assert.IsType<FunctionParameterNode>(typeNode.Body);
            var nodes = ((FunctionParameterNode)typeNode.Body).Nodes.ToList();
            Assert.Equal(3, nodes.Count);
            GenericParameterNode aGN = (GenericParameterNode)nodes[0];
            GenericParameterNode bGN = (GenericParameterNode)nodes[1];
            IdentifierNode result = (IdentifierNode)nodes[2];

            Assert.NotNull(aGN);
            Assert.NotNull(bGN);
            Assert.NotNull(result);

            Assert.Equal("'a", aGN.Id.Value);
            Assert.Equal("'b", bGN.Id.Value);
            Assert.Equal("number", result.Id.Value);
        }

        [Fact(DisplayName = "Expression - bind")]
        public void Expression_Bind() {
            var code = @"
type bindMaybe 'a 'b = Maybe 'a -> ('a -> 'b) -> Maybe 'b;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile();

            Assert.True(compilerResult.Ast.Count == 1);
        }
    }
}
