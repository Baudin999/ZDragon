using PlantUml.Net;
using System.IO;
using System.Threading.Tasks;

namespace Woezel.Project {
    public class PlantUmlRenderer {

        public async static Task<byte[]> Render(string puml) {
            var factory = new RendererFactory();

            var renderer = factory.CreateRenderer(new PlantUmlSettings());

            var bytes = await renderer.RenderAsync(puml, OutputFormat.Svg);
            return bytes;
        }
    }
}
