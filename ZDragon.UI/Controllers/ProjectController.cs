using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;

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
            try {
                var actualPath = path.Replace("__$__", "\\");
                _project.Reload(actualPath);
                _ = ProjectHub.ProjectChanged(_project.RootPath, _project.DirectoryInteractor);
                return Ok();
            } catch (Exception ex) {
                return Problem(
                    title: $"Failed to initialize project: {path}",
                    detail: ex.Message
                    );
            }
        }


        [HttpGet("/project/index")]
        public IActionResult GetIndex() {
            try {
                var index = _project.GetComponentNodes();
                return Ok(index);
            }
            catch (Exception ex) {
                return Problem(
                   title: $"Failed to generate an Index",
                   detail: ex.Message
                   );
            }
        }

    }

}
