using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Net;
using System.Threading.Tasks;

namespace Woezel.UI.Controllers {

    public class DocumentController : ControllerBase {

        private readonly ILogger<DocumentController> _logger;

        public DocumentController(ILogger<DocumentController> logger) {
            _logger = logger;
        }

        [HttpGet("/document/{path}")]
        public async Task<IActionResult> Index([FromRoute]string path) {
            // rehydrate path
            //var realPath = path.Replace("___", "\\");
            var realPath = WebUtility.UrlDecode(path);
            if (Program.Project.IsValidProjectPath(realPath)) {
                var text = await Program.Project.GetTextByPath(realPath);
                return Ok(text);
            }
            else {
                return Unauthorized("Unauthorized path");
            }
        }

        [HttpPost("/document")]
        public async Task<IActionResult> Submit([FromBody] DocumentSubmitBody body) {
            if (Program.Project.IsValidProjectPath(body.Path)) {
                // get the file info
                var fInfo = Program.Project.GetFileInfo(body.Namespace);

                if (fInfo != null) {

                    // First we save the document
                    await Program.Project.SaveFile(body.Path, body.Code);

                    // reset the cache
                    Program.Project.Cache.ErrorSink.Reset();
                    
                    // compile the result
                    var compilerResult = Program.Project.Compile(fInfo, body.Code, Program.Project.Cache);
                    _ = Program.Project.SaveCompilerResult(fInfo, compilerResult);


                    // return the result
                    return Ok(compilerResult);
                }
                else {
                    return BadRequest("Invalid namespace");
                }
            }
            else {
                return Unauthorized("Unauthorized path");
            }
        }

        [HttpGet("/documents")]
        public IActionResult GetDocuments() {
            return Ok(Program.Project.Dir);
        }

        [HttpGet("/documents/{ns}.json")]
        public IActionResult GetContentJson(string ns) {
            var compilationResult = Program.Project.GetCompilationResult(ns);
            var text = JsonConvert.SerializeObject(compilationResult);
            return Content(text, "application/json");
        }

        [HttpGet("/documents/{ns}.svg")]
        public async Task<IActionResult> GetContentSvg(string ns) {
            var bytes = await Program.Project.GetSvg(ns);
            return File(bytes, "image/svg+xml");
        }

        [HttpGet("/documents/{ns}.html")]
        public async Task<IActionResult> HetHtmlString(string ns) {
            var bytes = await Program.Project.GetHtml(ns);
            return File(bytes, "text/html");
        }


    }

    public class DocumentSubmitBody {
        public string Path { get; set; }
        public string Namespace { get; set; }
        public string Code { get; set; }
    }
}
