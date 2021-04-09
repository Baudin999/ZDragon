using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.IO;

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
                var actualPath = path.Replace("__$__", Path.DirectorySeparatorChar.ToString());
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

        [HttpPost("/project/unload")]
        public IActionResult Unload() {
            try {
                _project.Unload();
                _ = ProjectHub.ProjectChanged("", _project.DirectoryInteractor);
                return Ok();
            }
            catch (Exception ex) {
                return Problem(
                   title: $"Failed to unload the project",
                   detail: ex.Message
                   );
            }
        }



        [HttpGet("/project/search/{query}")]
        public IActionResult Search(string query) {
            try {
                var result = _project.Search(query);
                return Ok(result);
            }
            catch (Exception ex) {
                return Problem(
                   title: $"Failed to search the compilation cache",
                   detail: ex.Message
                   );
            }
        }

    }

}
