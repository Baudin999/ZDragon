using ElectronNET.API;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ZDragon.UI {
    public class Program {

        public static Project.Project Project { get; private set; }

        public static void Main(string[] args) {
            //Console.WriteLine("INIT APP");
            //_ = initProject(args);

            var path = Directory.GetCurrentDirectory();

            //foreach (var arg in args) {
            //    if (Directory.Exists(arg)) path = arg;
            //}

            Program.Project = new Project.Project(path);

            CreateHostBuilder(args).Build().Run();
        }

        //private static async Task initProject(string[] args) {
        //    try {
        //        //Console.WriteLine("INIT PROJECT");
        //        //if (await Electron.App.CommandLine.HasSwitchAsync("path")) {
        //        //    var cli = await Electron.App.CommandLine.GetSwitchValueAsync("path");
        //        //    Console.WriteLine("CLI PATH!!!");
        //        //    Console.WriteLine(cli);
        //        //    Console.WriteLine("");
        //        //    Console.WriteLine("");
        //        //    Console.WriteLine("");
        //        //    Console.WriteLine("");
        //        //}


        //        //foreach (var arg in args) {
        //        //    Console.WriteLine(arg);
        //        //}
        //        // init project
        //        var path = Directory.GetCurrentDirectory();

        //        foreach (var arg in args) {
        //            if (Directory.Exists(arg)) path = arg;
        //        }

        //        Program.Project = new Project.Project(path);
        //    }
        //    catch (Exception ex) {
        //        Console.WriteLine("FAILED...");
        //        Console.WriteLine(ex.Message);
        //    }
        //}

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder => {
                    webBuilder
                        .UseElectron(args)
                        .UseStartup<Startup>();
                });
    }
}
