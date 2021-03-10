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
        private readonly ProjectHub _projectHub;

        public DocumentController(ILogger<DocumentController> logger, Project.Project project, ProjectHub projectHub) {
            _logger = logger;
            _project = project;
            _projectHub = projectHub;
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
        public async Task<IActionResult> SaveModule([FromRoute] string ns, [FromBody] DocumentSubmitBody body) {
            var moduleInteractor = _project.Find<ModuleInteractor>(ns);
            var result = await moduleInteractor.SaveModule(body.Code);

            _ = _projectHub.ModuleChanged(result.Namespace);

            return Ok(result.CompilationResult);
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
        public async Task<IActionResult> GetHtmlString(string ns, string file) {
            var moduleInteractor = _project.Find<ModuleInteractor>(ns);
            if (moduleInteractor != null) {
                return File(await moduleInteractor.GetHtml(), "text/html");
            }
            else {
                return NotFound();
            }
        }

        [HttpGet("/images/{file}")]
        public async Task<IActionResult> GetImage(string file) {
            try {
                var bytes = await _project.GetImage(file);
                return File(bytes, "image/png");
            }
            catch (System.Exception) {
                return NotFound();
            }
        }


    }


}
