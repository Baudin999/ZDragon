using ElectronNET.API;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ZDragon.UI {
    public class Program {

        //public static Project.Project Project { get; private set; }

        public static void Main(string[] args) {
            ZDragon.Project.Project.CurrentProject = new Project.Project();
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder => {
                    webBuilder
                        .UseElectron(args)
                        .UseStartup<Startup>();
                });
    }
}
