using PlantUml.Net;
using System.IO;

namespace Woezel.Project {
    public class PlantUmlRenderer {

        public async static void Render(string puml) {
            var factory = new RendererFactory();

            var renderer = factory.CreateRenderer(new PlantUmlSettings());

            var bytes = await renderer.RenderAsync(puml, OutputFormat.Png);
            File.WriteAllBytes("D:\\TEMP\\out.png", bytes);

        }
    }
}
