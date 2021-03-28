using Compiler.Language.Nodes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Threading.Tasks;
using ZDragon.Transpilers.OpenAPI;
using ZDragon.UI.Models;

namespace ZDragon.UI.Controllers {

    public class FileController : ControllerBase {

        private readonly Project.Project _project;
        private readonly ILogger<FileController> _logger;
        private readonly ProjectHub _projectHub;

        public FileController(ILogger<FileController> logger, Project.Project project, ProjectHub hub) {
            _logger = logger;
            _project = project;
            _projectHub = hub;
        }
    

        [HttpPost("/file")]
        public async Task<IActionResult> AddFile([FromBody] CreateFileSubmitBody body) {
            try {
                // the namespace is the folder to which the fill will be added
                // the body is the FileSubmit

                var app = _project.Find(body.AppName);
                _ = await app.AddFile(body.Name, body.Type, body.Description);
                _project.ResetDirectory();

                _ = RefreshProjectStructure();

                return Ok();
            } catch (System.Exception ex) {
                _logger.Log(LogLevel.Error, $"Failed to add a file to the project: {body.AppName}.{body.Type}.{body.Name}");
                return Problem(
                   title: $"Failed to add a file to the project: {body.AppName}.{body.Type}.{body.Name}",
                   detail: ex.Message
                   );
            }
        }

        [HttpPost("/json")]
        public IActionResult GenerateJson([FromBody] GenerateJsonBody body) {
            try {

                var compilationResult = new Compiler.Compiler(body.Code).Compile().Check();
                var rootNode = compilationResult.Lexicon.Values.FirstOrDefault(n => n is ILanguageNode);
                var schema = new JsonSchemaTranspiler(rootNode, compilationResult.Lexicon).Transpile();

                var result = new {
                    schemaText = schema.ToString(),
                    schema
                };

                return Ok(result);
            }
            catch (System.Exception ex) {
                return Problem(
                   title: $"Failed to generate Json",
                   detail: ex.Message
                   );
            }
        }

        private async Task RefreshProjectStructure() {
            await Task.Delay(1000);
            _ = _projectHub.ProjectChanged(_project.RootPath, _project.DirectoryInteractor);
        }

    }


    public class GenerateJsonBody {
        public string Code { get; set; }
    }

}
