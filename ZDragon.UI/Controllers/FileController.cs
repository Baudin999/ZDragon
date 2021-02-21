using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using ZDragon.UI.Models;

namespace ZDragon.UI.Controllers {

    public class FileController : ControllerBase {

        private readonly Project.Project _project;
        private readonly ILogger<FileController> _logger;

        public FileController(ILogger<FileController> logger, Project.Project project) {
            _logger = logger;
            _project = project;
        }
    

        [HttpPost("/file")]
        public async Task<IActionResult> AddFile([FromBody] CreateFileSubmitBody body) {

            // the namespace is the folder to which the fill will be added
            // the body is the FileSubmit

            var app = _project.Find(body.AppName);
            _ = await app.AddFile(body.Name, body.Type, body.Description);
            _project.ResetDirectory();
            return Ok(_project.DirectoryInteractor);
        }

    }


}
