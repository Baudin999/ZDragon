using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ZDragon.Project.Interactors;
using ZDragon.UI.Models;

namespace ZDragon.UI.Controllers {

    public class ApplicationController : ControllerBase {

        private readonly Project.Project _project;
        private readonly ILogger<ApplicationController> _logger;
        private readonly ProjectHub _projectHub;

        public ApplicationController(ILogger<ApplicationController> logger, Project.Project project, ProjectHub hub) {
            _logger = logger;
            _project = project;
            _projectHub = hub;
        }


        [HttpPost("/application")]
        public IActionResult CreateApplication([FromBody] CreateApplicationSubmitBody body) {

            // the namespace is the folder to which the fill will be added
            // the body is the FileSubmit

            _project.CreateApplication(body.Name);
            _project.ResetDirectory();
            _ = _projectHub.ProjectChanged(_project.DirectoryInteractor);
            return Ok();

        }


        [HttpGet("/application/lexicon/{ns}")]
        public IActionResult GetLexiconForApplication([FromRoute]string ns) {
            var moduleInteractor = _project.FindInteractorByNamespace<IModuleInteractor>(ns);
            var index = moduleInteractor.ApplicationInteractor.CreateIndex(moduleInteractor.FileType);
            return Ok(index);

        }

    }


}
