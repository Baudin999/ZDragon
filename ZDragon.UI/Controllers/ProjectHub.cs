using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using ZDragon.Project.Interactors;

namespace ZDragon.UI.Controllers {
    public class ProjectHub : Hub {
        public async Task SendMessage(string message) {
            try {
                if (Clients != null)
                    await Clients.All.SendAsync("ReceiveMessage", message);
            }
            catch (System.Exception) {
                // do nothing
            }
        }

        internal async Task ModuleChanged(string ns) {
            try {
                if (Clients != null)
                    await Clients.All.SendAsync("ModuleChanged", ns);
            }
            catch (System.Exception) {
                // do nothing
            }
        }

        internal async Task ProjectChanged(string rootPath, DirectoryInteractor dir) {
            try {
                if (Clients != null) {
                    await Clients.All.SendAsync("ProjectChanged", new { rootPath, dir });
                }
            }
            catch (System.Exception) {
                // do nothing
            }
        }
    }
}
