using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using ZDragon.UI.Models;

namespace ZDragon.UI.Controllers {

    public class FileController : ControllerBase {

        private readonly Project.Project _project;
        private readonly ILogger<FileController> _logger;
        private readonly ProjectHub _projectHub;

        public FileController(ILogger<FileController> logger, Project.Project project, ProjectHub hub) {
            _logger = logger;
            _project = project;
            _projectHub = hub;
        }
    

        [HttpPost("/file")]
        public async Task<IActionResult> AddFile([FromBody] CreateFileSubmitBody body) {

            // the namespace is the folder to which the fill will be added
            // the body is the FileSubmit

            var app = _project.Find(body.AppName);
            _ = await app.AddFile(body.Name, body.Type, body.Description);
            _project.ResetDirectory();
            _ = _projectHub.ProjectChanged(_project.DirectoryInteractor);
            return Ok(_project.DirectoryInteractor);
        }

    }


}
