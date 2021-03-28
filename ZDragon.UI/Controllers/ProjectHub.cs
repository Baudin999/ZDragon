using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using ZDragon.Project.Interactors;

namespace ZDragon.UI.Controllers {
    public class ProjectHub : Hub {

        public ProjectHub() {
            ZDragon.Project.Project.CurrentProject.OnMessageSent += Project_OnMessageSent;
        }

        private void Project_OnMessageSent(object sender, Project.MessageEventArgs args) {
            try {
                if (Clients != null) {
                    Console.WriteLine("Sending Message: " + args.Message);
                    _ = Clients.All.SendAsync("ReceiveMessage", args);
                }
            }
            catch (System.Exception ex) {
                Console.WriteLine(ex.Message);
            }
        }

        internal async Task ModuleChanged(string ns) {
            try {
                await Task.Delay(300);
                if (Clients != null) {
                    await Clients.All.SendAsync("ModuleChanged", ns);
                }
            }
            catch (System.Exception) {
                // do nothing
            }
        }

        internal async Task ProjectChanged(string rootPath, IDirectoryInteractor dir) {
            try {
                if (Clients != null) {
                    await Clients.All.SendAsync("ProjectChanged", new { rootPath, dir });
                }
            }
            catch (System.Exception) {
                // do nothing
            }
        }

        public override Task OnConnectedAsync() {
            _ = Clients.All.SendAsync("ReceiveMessage", new Project.MessageEventArgs("Client Connected"));
            return base.OnConnectedAsync();
        }
    }
}
