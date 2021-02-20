using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Net;
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
    

        [HttpGet("/file/{ns}")]
        public async Task<IActionResult> AddFile([FromRoute] string ns, [FromBody] DocumentSubmitBody body) {

            // the namespace is the folder to which the fill will be added
            // the body is the FileSubmit


            return Ok();
        }

    }


}
