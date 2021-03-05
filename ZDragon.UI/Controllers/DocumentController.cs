using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Threading.Tasks;
using ZDragon.Project.Interactors;
using ZDragon.UI.Models;

namespace ZDragon.UI.Controllers {

    public class DocumentController : ControllerBase {

        private readonly Project.Project _project;
        private readonly ILogger<DocumentController> _logger;

        public DocumentController(ILogger<DocumentController> logger, Project.Project project) {
            _logger = logger;
            _project = project;
        }
    

        [HttpGet("/document/{ns}")]
        public async Task<IActionResult> Index([FromRoute]string ns) {
            var realPath = WebUtility.UrlDecode(ns);
            if (Program.Project.IsValidProjectPath(realPath)) {
                var moduleInteractor = _project.Find<ModuleInteractor>(ns);
                var text = await moduleInteractor.GetText();

                return Ok(new {
                    text,
                    compilationResult = moduleInteractor.Compile(text)
                });
            }
            else {
                return Unauthorized("Unauthorized path");
            }
        }

        [HttpPost("/document/{ns}")]
        public IActionResult SaveModule([FromRoute] string ns, [FromBody] DocumentSubmitBody body) {
            var moduleInteractor = _project.Find<ModuleInteractor>(ns);
            moduleInteractor.SaveModule(body.Code);
            return Ok(moduleInteractor.CompilationResult);
        }

        [HttpGet("/documents/{ns}/{file}.svg")]
        public async Task<IActionResult> GetContentSvg(string ns, string file) {
            var moduleInteractor = _project.Find<ModuleInteractor>(ns);

            if (file == "data") {
                var bytes = await moduleInteractor.GetDataModelSvg();
                return File(bytes, "image/svg+xml");
            }
            else if (file == "components") {
                var bytes = await moduleInteractor.GetComponentModelSvg();
                return File(bytes, "image/svg+xml");
            }
            else {
                var bytes = await moduleInteractor.GetSvg(file);
                if (bytes == null) return NotFound();
                else return File(bytes, "image/svg+xml");
            }
        }


        [HttpGet("/documents/{ns}/{file}.html")]
        public async Task<IActionResult> HetHtmlString(string ns, string file) {
            var moduleInteractor = _project.Find<ModuleInteractor>(ns);
            return File(await moduleInteractor.GetHtml(), "text/html");
        }


    }


}
