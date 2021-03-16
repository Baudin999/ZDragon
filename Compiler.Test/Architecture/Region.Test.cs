using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Architecture {
    public class Region {

        [Fact(DisplayName = "Region - simple")]
        public void SimpleDocumentRegion() {
            var code = @"
% region: Something

# The Something component

This component is quite something. We will have to write some more documentation on this component.

Just the ""Description"" field is not enough!

% end


component Something =
    Name: Something Title
    Description: %something

";
            var result = new Compiler.Compiler(code).Compile().Check();
            Assert.Empty(result.Errors);
        }
    }
}
