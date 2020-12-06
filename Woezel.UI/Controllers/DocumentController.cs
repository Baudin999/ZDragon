using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Threading.Tasks;
using Woezel.Project;

namespace Woezel.UI.Controllers {

    public class DocumentController : ControllerBase {

        private readonly ILogger<DocumentController> _logger;

        public DocumentController(ILogger<DocumentController> logger) {
            _logger = logger;
        }

        [HttpGet("/document/{path}")]
        public async Task<IActionResult> Index([FromRoute]string path) {
            // rehydrate path
            //var realPath = path.Replace("___", "\\");
            var realPath = WebUtility.UrlDecode(path);
            if (Program.Project.IsValidProjectPath(realPath)) {
                var text = await Program.Project.GetTextByPath(realPath);
                return Ok(text);
            }
            else {
                return Unauthorized("Unauthorized path");
            }
        }

        [HttpPost("/document")]
        public async Task<IActionResult> Submit([FromBody] DocumentSubmitBody body) {
            if (Program.Project.IsValidProjectPath(body.Path)) {
                // First we save the document
                await Program.Project.SaveFile(body.Path, body.Code);

                // render some useless plantuml
                var puml = @"
@startuml
!define DARKBLUE
!includeurl https://raw.githubusercontent.com/Drakemor/RedDress-PlantUML/master/style.puml

Bob->Alice : Hello
@enduml
";
                PlantUmlRenderer.Render(puml);

                // compile the result
                var compilerResult = new Compiler.Compiler(body.Code).Compile();
                return Ok(compilerResult);
            }
            else {
                return Unauthorized("Unauthorized path");
            }
        }

        [HttpGet("/documents")]
        public async Task<IActionResult> GetDocuments() {
            return Ok(Program.Project.Dir);
        }
    }

    public class DocumentSubmitBody {
        public string Path { get; set; }
        public string Code { get; set; }
    }
}
