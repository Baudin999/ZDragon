using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using Woezel.UI.Models;

namespace Woezel.UI.Controllers {

    public class DomainController : ControllerBase {

        private readonly ILogger<DocumentController> _logger;

        public DomainController(ILogger<DocumentController> logger) {
            _logger = logger;
        }

        [HttpPost("/domain")]
        public IActionResult PostDomain([FromBody]Domain domain) {
            System.Console.WriteLine(domain.Name);
            System.Console.WriteLine(domain.Description);
            return Ok("It worked");
        }



    }

}
