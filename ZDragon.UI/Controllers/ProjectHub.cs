using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;

namespace ZDragon.UI.Controllers {
    public class ProjectHub : Hub {
        public async Task SendMessage(string message) {
            try {

                await Clients.All.SendAsync("ReceiveMessage", message);
            }
            catch (System.Exception) {
                // do nothing
            }
        }

        internal async Task ModuleChanged(string ns) {
            try {
                await Clients.All.SendAsync("ModuleChanged", ns);
            }
            catch (System.Exception) {
                // do nothing
            }
        }
    }
}
