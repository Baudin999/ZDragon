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
    Url: /api/v0/profile/{profileId}
    Method: GET
    Description: Get the right Profile by the Profile ProfileId,
        and return the right Profile

record Profile
type ProfileId = Guid;
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Empty(compilerResult.Errors);
            Assert.Empty(compilerResult.Warnings);
            Assert.Equal(3, compilerResult.Tokens.Count());
            Assert.IsType<EndpointNode>(compilerResult.Ast.First());

            var endPointNode = (EndpointNode)compilerResult.Ast.First();
            Assert.NotNull(endPointNode.TypeDefinition);

            // test the type definition
            Assert.IsType<FunctionParameterNode>(endPointNode.TypeDefinition);
#pragma warning disable CS8600 // Converting null literal or possible null value to non-nullable type.
            FunctionParameterNode fun = (FunctionParameterNode)endPointNode.TypeDefinition;
#pragma warning restore CS8600 // Converting null literal or possible null value to non-nullable type.
            Assert.Equal(2, fun?.Nodes.Count ?? 0);

            Assert.Equal("ProfileId", ((IdentifierNode?)fun?.Nodes[0])?.Id);

            var tan = (TypeApplicationNode?)fun?.Nodes[1] ?? null;
            Assert.Equal(2, tan?.Parameters.Count ?? 0);
            Assert.Equal("Maybe", tan?.Parameters[0].Value);
            Assert.Equal("Profile", tan?.Parameters[1].Value);

        }

        [Fact(DisplayName = "EndPoint - Type Error")]
        public void EndPoint_TypeError() {
            var code = @"
endpoint GetProfile :: ProfileId -> Maybe Profile =
    Name: Get Profile
";
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            Assert.Equal(2, compilerResult.Errors.Count);
            Assert.Equal(2, compilerResult.Warnings.Count);

        }

        [Fact(DisplayName = "EndPoint - Markdown Description")]
        public void EndPoint_MarkdownDescription() {
            var code = @"

endpoint GetNextBestOffer :: ProfileId -> Offer =
    Name: Get Next Best Offer
    Url: /api/v0/get_next_best_offer/{profileId}
    Description: Get Next Best Offer
    Method: POST
    Version: 0
    Interactions:
        - Matching
    Documentation:
        We will want to get the next best offer
        from the OfferStore. This API can be
        called with the profileId and will return 
        a set of unique offers for this profile.

        Some bulletpoints to make a point:
         * First
             * extra
         * Second

type ProfileId = String;
record Offer
";
            var result = new Compiler.Compiler(code).Compile().Check();

            Assert.NotNull(result);
            Assert.Equal(3, result.Ast.Count);
            Assert.Equal(3, result.Lexicon.Count);

        }
    }
}


