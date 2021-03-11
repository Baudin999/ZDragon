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



        [HttpPost("/project/init/{path}")]
        public IActionResult InitProject(string path) {
            var actualPath = path.Replace("__$__", "\\");
            _project.Reload(actualPath);
            _ = ProjectHub.ProjectChanged(_project.RootPath, _project.DirectoryInteractor);
            return Ok();
        }

    }

}
