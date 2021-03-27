using Compiler.Language.Nodes;
using Xunit;

namespace Documentation {
    public class Roadmap {

        [Fact()]
        public void CreateRoadmap() {

            var code = @"
roadmap MyRoadmap =
    Contains:
        - Foo
        - Bar

task Foo =
    Starts: 1
    Duration: 9

task Bar =
    DependsUpon: Foo
    Duration: 6

milestone Done =
    DependsUpon: Bar
";

            var result = new Compiler.Compiler(code).Compile().Check();
            Assert.Empty(result.Errors);

            Assert.Equal(4, result.Ast.Count);

            Assert.IsType<RoadmapNode>(result.Lexicon["MyRoadmap"]);
            Assert.IsType<TaskNode>(result.Lexicon["Foo"]);
            Assert.IsType<TaskNode>(result.Lexicon["Bar"]);
            Assert.IsType<MilestoneNode>(result.Lexicon["Done"]);



        }
    }
}
