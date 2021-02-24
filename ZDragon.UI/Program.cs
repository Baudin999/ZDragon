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
            var path = "D:\\TEMP\\003";

            //Console.WriteLine($"Current directory: {path}");
            //if (args.Length > 0) {
            //    if (Directory.Exists(args[0])) path = args[0];
            //}

            Program.Project = new Project.Project(path);

            //System.Console.WriteLine($"The final path is: {path}");

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
