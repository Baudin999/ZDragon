using PlantUml.Net;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ZDragon.Project {
    public class PlantUmlRenderer {

        public async static Task<byte[]> Render(string puml) {
            try {
                var currentPath = Directory.GetCurrentDirectory();
                var plantUmlPath = Path.Combine(currentPath, "PlantUml/");

                var factory = new RendererFactory();
                var settings = new PlantUmlSettings {
                    
                    LocalPlantUmlPath = plantUmlPath
                };
                var renderer = factory.CreateRenderer(settings);
                var bytes = await renderer.RenderAsync(puml, OutputFormat.Svg);
                return bytes;
            } catch (Exception ex) {

                ZDragon.Project.Project.CurrentProject?.SendMessage(@$"
Failed to generate PlantUML diagram:

{ex.Message}
");

                throw new Exception("Failed to generate a correct PlantUml diagram.");
            }
        }
    }
}
