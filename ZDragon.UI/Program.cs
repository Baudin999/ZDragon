using ElectronNET.API;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System.IO;

namespace ZDragon.UI {
    public class Program {

        public static Project.Project Project { get; private set; }

        public static void Main(string[] args) {
            // init project
            var path = args.Length > 0 ? args[0] : Directory.GetCurrentDirectory();
            Program.Project = new Project.Project(path);

            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder => {
                    webBuilder
                        .UseStartup<Startup>()
                        .UseElectron(args);
                });
    }
}
