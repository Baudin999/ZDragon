using ElectronNET.API;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System;
using System.IO;

namespace ZDragon.UI {
    public class Program {

        public static Project.Project Project { get; private set; }

        public static void Main(string[] args) {
            // init project
            var path = Directory.GetCurrentDirectory();

            foreach (var arg in args) {
                if (Directory.Exists(arg)) path = arg;
            }

            Program.Project = new Project.Project(path);
            

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
