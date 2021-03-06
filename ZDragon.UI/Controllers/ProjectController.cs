using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace ZDragon.UI.Controllers {

    public class ProjectController : ControllerBase {

        private readonly ILogger<DocumentController> _logger;
        private readonly Project.Project _project;
        private readonly ProjectHub ProjectHub;

        public ProjectController(ILogger<DocumentController> logger, Project.Project project, ProjectHub hub) {
            _logger = logger;
            _project = project;

            this.ProjectHub = hub;
        }


        [HttpGet("/domains")]
        public IActionResult GetDomains() {
            ProjectHub.SendMessage("Hello, from SignalR");
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
