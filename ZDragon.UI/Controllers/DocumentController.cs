using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Threading.Tasks;
using ZDragon.Project.Interactors;
using ZDragon.UI.Models;

namespace ZDragon.UI.Controllers {

    public class DocumentController : ControllerBase {

        private readonly Project.Project _project;
        private readonly ProjectHub _projectHub;

        public DocumentController(Project.Project project, ProjectHub projectHub) {
            _project = project;
            _projectHub = projectHub;
        }
    

        [HttpGet("/document/{ns}")]
        public async Task<IActionResult> Index([FromRoute]string ns) {
            var realPath = WebUtility.UrlDecode(ns);
            if (ZDragon.Project.Project.CurrentProject.IsValidProjectPath(realPath)) {
                var moduleInteractor = _project.FindInteractorByNamespace<IModuleInteractor>(ns);
                if (moduleInteractor != null) {
                    var text = await moduleInteractor.GetText();

                    return Ok(new {
                        text,
                        compilationResult = moduleInteractor.Compile(text),
                        moduleInteractor.Namespace,
                        ApplicationName = moduleInteractor.ApplicationInteractor.Namespace
                    });
                }
                else {
                    return NotFound($"\"{ns}\" not found");
                }
            }
            else {
                return Unauthorized("Unauthorized path");
            }
        }

        [HttpPost("/document/{ns}")]
        public async Task<IActionResult> SaveModule([FromRoute] string ns, [FromBody] DocumentSubmitBody body) {
            var moduleInteractor = _project.FindInteractorByNamespace<IModuleInteractor>(ns);
            if (moduleInteractor != null) {
                var result = await moduleInteractor.SaveModule(body.Code);
                _project.SaveIndex();
                _ = _projectHub.ModuleChanged(result.Namespace);
                return Ok(result.CompilationResult);
            }
            else {
                return NotFound();
            }
        }

        [HttpPost("/document/compile/{ns}")]
        public IActionResult CompileModule([FromRoute] string ns, [FromBody] DocumentSubmitBody body) {
            var moduleInteractor = _project.FindInteractorByNamespace<IModuleInteractor>(ns);
            return Ok(moduleInteractor.Compile(body.Code));
        }


        [HttpGet("/documents/{ns}/{file}.svg")]
        public async Task<IActionResult> GetContentSvg(string ns, string file) {
            try {
                var moduleInteractor = _project.FindInteractorByNamespace<IModuleInteractor>(ns);
                if (moduleInteractor is null) return Problem("Namespace not found");

                if (file == "data") {
                    var bytes = await moduleInteractor.GetDataModelSvg();
                    return File(bytes, "image/svg+xml");
                }
                else if (file == "components") {
                    var bytes = await moduleInteractor.GetComponentModelSvg();
                    return File(bytes, "image/svg+xml");
                }
                else if (file == "roadmap") {
                    var bytes = await moduleInteractor.GetSvg(file);
                    return File(bytes, "image/svg+xml");
                }
                else {
                    var bytes = await moduleInteractor.GetSvg(file);
                    if (bytes == null) return NotFound();
                    else return File(bytes, "image/svg+xml");
                }
            }
            catch (System.Exception ex) {
                return Problem(ex.Message);
            }
        }


        [HttpGet("/documents/{ns}/{file}.html")]
        public async Task<IActionResult> GetHtmlString(string ns, string file) {
            var moduleInteractor = _project.FindInteractorByNamespace<IModuleInteractor>(ns);
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

        [HttpGet("/document/find/{ns}/{id}")]
        public IActionResult GetFragment(string ns, string id) {
            try {
                var fragment = _project.FindFragment(ns, id);
                if (fragment is not null) {
                    return Ok(fragment);
                }
                else {
                    return NotFound();
                }
            }
            catch (System.Exception ex) {
                Console.WriteLine(ex.Message);
                return Problem(
                  title: $"Failed to get the fragment"
                  );
            }
        }




    }


}
