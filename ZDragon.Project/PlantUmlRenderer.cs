using PlantUml.Net;
using System;
using System.Threading.Tasks;

namespace ZDragon.Project {
    public class PlantUmlRenderer {

        public async static Task<byte[]> Render(string puml) {
            try {
                var factory = new RendererFactory();
                var renderer = factory.CreateRenderer(new PlantUmlSettings());
                var bytes = await renderer.RenderAsync(puml, OutputFormat.Svg);
                return bytes;
            } catch (Exception ex) {
                System.Console.WriteLine(ex.Message);
                throw ex;
            }
        }
    }
}
