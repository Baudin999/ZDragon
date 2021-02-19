using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ZDragon.UI.Models;

namespace ZDragon.UI.Controllers {

    public class DomainController : ControllerBase {

        private readonly ILogger<DocumentController> _logger;
        private readonly Project.Project _project;

        public DomainController(ILogger<DocumentController> logger, Project.Project project) {
            _logger = logger;
            _project = project;
        }

        [HttpPost("/domain")]
        public IActionResult PostDomain([FromBody]Domain domain) {
            System.Console.WriteLine(domain.Name);
            System.Console.WriteLine(domain.Description);
            return Ok("It worked");
        }

        [HttpGet("/domains")]
        public IActionResult GetDomains() {
            return Ok(_project.DirectoryInteractor);
        }




    }

}
