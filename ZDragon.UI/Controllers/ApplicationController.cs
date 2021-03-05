using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ZDragon.Project.Interactors;
using ZDragon.UI.Models;

namespace ZDragon.UI.Controllers {

    public class ApplicationController : ControllerBase {

        private readonly Project.Project _project;
        private readonly ILogger<ApplicationController> _logger;

        public ApplicationController(ILogger<ApplicationController> logger, Project.Project project) {
            _logger = logger;
            _project = project;
        }


        [HttpPost("/application")]
        public IActionResult CreateApplication([FromBody] CreateApplicationSubmitBody body) {

            // the namespace is the folder to which the fill will be added
            // the body is the FileSubmit

            _project.CreateApplication(body.Name);
            _project.ResetDirectory();
            return Ok(_project.DirectoryInteractor);

        }


        [HttpGet("/application/lexicon/{ns}")]
        public IActionResult GetLexiconForApplication([FromRoute]string ns) {
            var moduleInteractor = _project.Find<ModuleInteractor>(ns);
            var index = moduleInteractor.ApplicationInteractor.CreateIndex(moduleInteractor.FileType);
            return Ok(index);

        }

    }


}
