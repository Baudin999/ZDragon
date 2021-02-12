using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Architecture {
    public class EndPoint {
        [Fact(DisplayName = "EndPoint - Simple")]
        public void EndPoint_Simple() {
            var code = @"
endpoint GetProfile :: ProfileId -> Maybe Profile =
    Name: Get Profile
    Title: Get Profile by ProfileId
    Description: Get the right Profile by the Profile ProfileId,
        and return the right Profile
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.Single(compilerResult.Tokens);
            Assert.IsType<EndPointNode>(compilerResult.Ast.First());

            var endPointNode = (EndPointNode)compilerResult.Ast.First();
            Assert.NotNull(endPointNode.TypeDefinition);

            // test the type definition
            Assert.IsType<FunctionParameterNode>(endPointNode.TypeDefinition);
            FunctionParameterNode fun = (FunctionParameterNode)endPointNode.TypeDefinition;
            Assert.Equal(2, fun.Nodes.Count);

            Assert.Equal("ProfileId", ((IdentifierNode)fun.Nodes[0]).Id);

            TypeApplicationNode tan = (TypeApplicationNode)fun.Nodes[1];
            Assert.Equal(2, tan.Parameters.Count);
            Assert.Equal("Maybe", tan.Parameters[0].Value);
            Assert.Equal("Profile", tan.Parameters[1].Value);


        }
    }
}


/*
 * 

*/