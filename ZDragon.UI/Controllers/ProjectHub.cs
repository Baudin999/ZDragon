using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace ZDragon.UI.Controllers {
    public class ProjectHub : Hub {
        public async Task SendMessage(string message) {
            await Clients.All.SendAsync("ReceiveMessage", message);
        }
    }
}
