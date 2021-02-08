using Compiler.Language.Nodes;
using System.Linq;
using Xunit;

namespace Architecture {
    public class EndPoint {
        [Fact(DisplayName = "Component - Simple")]
        public void Component_Simple() {
            var code = @"
endpoint GetProfile :: ProfileId -> Maybe Profile =
    Name: Get Profile
    Title: Get Profile by ProfileId
    Description: Get the right Profile by the Profile ProfileId,
        and return the right Profile        
    Params: 
        - ProfileId
    Response:
        - Maybe Profile
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Single(compilerResult.Tokens);
            Assert.IsType<EndPointNode>(compilerResult.Ast.First());
        }
    }
}


/*
 * 

*/