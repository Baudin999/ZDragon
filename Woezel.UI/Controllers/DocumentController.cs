using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;


namespace Woezel.UI.Controllers {

    public class DocumentController : ControllerBase {

        private readonly ILogger<DocumentController> _logger;

        public DocumentController(ILogger<DocumentController> logger) {
            _logger = logger;
        }

        [HttpGet("/document/{ns}")]
        public async Task<IActionResult> Index([FromRoute]string ns) {
            return Ok(await Program.Project.GetTextByNamespace(ns));
        }

        [HttpPost("/document")]
        public async Task<IActionResult> Submit([FromBody] DocumentSubmitBody body) {
            var compilerResult = new Compiler.Compiler(body.Code).Compile();
            return Ok(compilerResult);
        }

        [HttpGet("/documents")]
        public async Task<IActionResult> GetDocuments() {
            return Ok(Program.Project.Dir);
        }
    }

    public class DocumentSubmitBody {
        public string Code { get; set; }
    }
}
