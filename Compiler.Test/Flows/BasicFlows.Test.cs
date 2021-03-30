using Compiler.Language.Nodes;
using Xunit;

namespace Flows {
    public class BasicFlows {

        [Fact(DisplayName = "Flows - Simple 001")]
        public void Flows_Simple_001() {

            var code = @"
flow GetPerson =
    FrontEnd -> PersonSystem
";

            var result = new Compiler.Compiler(code).Compile().Check();

            Assert.Empty(result.Errors);
            Assert.Single(result.Ast);
            Assert.IsType<FlowNode>(result.Ast[0]);

            var flowNode = (FlowNode)result.Ast[0];
            Assert.Equal("GetPerson", flowNode.Id);
            Assert.Single(flowNode.Steps);
        }


        [Fact(DisplayName = "Flows - Simple 002")]
        public void Flows_Simple_002() {

            var code = @"
flow GetPerson =
    FrontEnd -> PersonSystem
    PersonSystem -> Database
";

            var result = new Compiler.Compiler(code).Compile().Check();

            Assert.Empty(result.Errors);
            Assert.Single(result.Ast);
            Assert.IsType<FlowNode>(result.Ast[0]);

            var flowNode = (FlowNode)result.Ast[0];
            Assert.Equal("GetPerson", flowNode.Id);
            Assert.Equal(2, flowNode.Steps.Count);
        }

    }
}
