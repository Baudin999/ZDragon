using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace ZDragon.UI.Controllers {

    public class ProjectController : ControllerBase {

        private readonly ILogger<DocumentController> _logger;
        private readonly Project.Project _project;

        public ProjectController(ILogger<DocumentController> logger, Project.Project project) {
            _logger = logger;
            _project = project;
        }


        [HttpGet("/domains")]
        public IActionResult GetDomains() {
            return Ok(_project.DirectoryInteractor);
        }


        [HttpPost("/project/init/{path}")]
        public IActionResult InitProject(string path) {
            //
            _project.Reload(path);
            return Ok(_project.DirectoryInteractor);
        }

    }

}
