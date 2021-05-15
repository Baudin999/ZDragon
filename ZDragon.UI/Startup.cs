using ElectronNET.API;
using ElectronNET.API.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json.Converters;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace ZDragon.UI {
    public class Startup {
        public Startup(IConfiguration configuration) {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services) {
            services.AddControllersWithViews();
            services
                .AddControllers()
                .AddNewtonsoftJson(options => {
                    options.SerializerSettings.Converters.Add(new StringEnumConverter());
                    options.SerializerSettings.NullValueHandling = Newtonsoft.Json.NullValueHandling.Include;
                });
            services.AddSingleton<Controllers.ProjectHub>();
            services.AddSingleton<Project.Project>(sp => ZDragon.Project.Project.CurrentProject);
            services.AddSignalR().AddNewtonsoftJsonProtocol(options => {
                options.PayloadSerializerSettings.Converters.Add(new StringEnumConverter());
                options.PayloadSerializerSettings.NullValueHandling = Newtonsoft.Json.NullValueHandling.Include;
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, IHostApplicationLifetime lifetime) {
            if (env.IsDevelopment()) {
                //app.UseDeveloperExceptionPage();
            }
            else {
                //app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this
                // for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            lifetime.ApplicationStarted.Register(OnStartup);
            lifetime.ApplicationStopping.Register(OnShutdown);


            app.Use(async (context, next) => {
                var url = context.Request.Path.Value;


                var allowedPaths = new List<string> {
                    "/editor", "/logs", "/reader", "/home"
                };
                // Rewrite to index
                if (allowedPaths.Contains(url)) {
                    // rewrite and continue processing
                    context.Request.Path = "/";
                }

                await next();
            });



            app.UseStatusCodePagesWithReExecute("/");
            app.UseHttpsRedirection();
            app.UseDefaultFiles();
            app.UseStaticFiles();
            app.UseRouting();
            app.UseEndpoints(endpoints => {
                endpoints.MapControllers();
                endpoints.MapHub<Controllers.ProjectHub>("/project");
            });

            // Open the Electron-Window here
            var task = BootstrapElectron(lifetime);
            task.ContinueWith(t => {
                ZDragon.Project.Project.CurrentProject.SendMessage(@$"DONE!");
            });
        }

        private void OnStartup() {
            Project.PlantUmlRenderer.StartServer();
        }

        private void OnShutdown() {
            Project.PlantUmlRenderer.StopServer();
        }

        private static async Task BootstrapElectron(IHostApplicationLifetime lifetime) {
            try {
                var browserWindow = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions {
                    Width = 1600,
                    Height = 940,
                    AutoHideMenuBar = true,
                    Show = true,
                    //Frame = false,
                    TitleBarStyle = TitleBarStyle.hiddenInset
                });

                await browserWindow.WebContents.Session.ClearCacheAsync();

                browserWindow.RemoveMenu();

                browserWindow.OnReadyToShow += () => browserWindow.Show();
                browserWindow.SetTitle("ZDragon");
                //browserWindow.WebContents.OpenDevTools();
                browserWindow.OnClosed += lifetime.StopApplication;

            }
            catch (System.Exception ex) {
                System.Console.WriteLine(ex.Message);
            }
        }
    }
}
