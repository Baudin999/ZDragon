using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace ZDragon.Test.Server.Identity {
    public class Identity {

        [Fact(DisplayName = "Identity - Login")]
        public async Task Identity_Login() {

            await Task.Delay(500);
        }
    }
}
