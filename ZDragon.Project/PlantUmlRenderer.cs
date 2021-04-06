using PlantUmlCk;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ZDragon.Project {
    public class PlantUmlRenderer {

        public async static Task<byte[]> Render(string puml, bool localRendering) {
            try {
                var currentPath = Directory.GetCurrentDirectory();
                var plantUmlPath = Path.Combine(currentPath, "PlantUml");
                var plantUmlJarPath = Path.Combine(plantUmlPath, "plantuml.jar");


                if (localRendering && File.Exists(plantUmlJarPath)) {
                    var factory = new RendererFactory();
                    var settings = new PlantUmlSettings {

                        LocalPlantUmlPath = plantUmlJarPath, //plantUmlPath,
                        RenderingMode = RenderingMode.Local
                    };
                    var renderer = factory.CreateRenderer(settings);
                    var bytes = await renderer.RenderAsync(puml, OutputFormat.Svg);
                    return bytes;
                }
                else {
                    var factory = new RendererFactory();
                    var renderer = factory.CreateRenderer();
                    var bytes = await renderer.RenderAsync(puml, OutputFormat.Svg);
                    return bytes;
                }
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
