using ElectronNET.API;
using ElectronNET.API.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Woezel.UI {
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
                .AddJsonOptions(options => {
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, IHostApplicationLifetime lifetime) {
            if (env.IsDevelopment()) {
                app.UseDeveloperExceptionPage();
            }
            else {
                app.UseStatusCodePagesWithReExecute("/");
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this
                // for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseDefaultFiles();
            app.UseStaticFiles();
            app.UseRouting();
            app.UseEndpoints(endpoints => {
                endpoints.MapControllers();
            });

            // Open the Electron-Window here
            _ = BootstrapElectron(lifetime);
        }

        private async Task BootstrapElectron(IHostApplicationLifetime lifetime) {
            try {
                var browserWindow = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions {
                    Width = 1600,
                    Height = 940,
                    Show = false
                });

                await browserWindow.WebContents.Session.ClearCacheAsync();

                browserWindow.OnReadyToShow += () => browserWindow.Show();
                browserWindow.SetTitle("Woezel");
                //browserWindow.RemoveMenu();
                
                browserWindow.OnClosed += lifetime.StopApplication;

            } catch(System.Exception ex) {
                System.Console.WriteLine(ex.Message);
            }
        }
    }
}
