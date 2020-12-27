using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Net;
using System.Threading.Tasks;
using Woezel.Project;
using Woezel.Transpilers.PlantUML;

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


        //        private void Foo() {

        //            // render some useless plantuml
        //            //                var puml = @"
        //            //@startuml
        //            //!define DARKBLUE
        //            //!includeurl https://raw.githubusercontent.com/Drakemor/RedDress-PlantUML/master/style.puml

        //            //Bob->Alice : Hello
        //            //@enduml
        //            //";
        //            //                PlantUmlRenderer.Render(puml);
        //            //Foo();

        //            var puml = @"
        //@startuml ""techtribesjs""
        //!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
        //' uncomment the following line and comment the first to use locally
        //' !include C4_Container.puml

        //LAYOUT_TOP_DOWN()
        //'LAYOUT_AS_SKETCH()
        //LAYOUT_WITH_LEGEND()


        //Person_Ext(anonymous_user, ""Anonymous User"")
        //Person(aggregated_user, ""Aggregated User"")
        //Person(administration_user, ""Administration User"")

        //System_Boundary(c1, ""techtribes.js""){

        //    Container(web_app, ""Web Application"", ""Java, Spring MVC, Tomcat 7.x"", ""Allows users to view people, tribes, content, events, jobs, etc. from the local tech, digital and IT sector"")

        //    ContainerDb(rel_db, ""Relational Database"", ""MySQL 5.5.x"", ""Stores people, tribes, tribe membership, talks, events, jobs, badges, GitHub repos, etc."")

        //    Container(filesystem, ""File System"", ""FAT32"", ""Stores search indexes"")

        //    ContainerDb(nosql, ""NoSQL Data Store"", ""MongoDB 2.2.x"", ""Stores from RSS/Atom feeds (blog posts) and tweets"")

        //    Container(updater, ""Updater"", ""Java 7 Console App"", ""Updates profiles, tweets, GitHub repos and content on a scheduled basis"")
        //}

        //            System_Ext(twitter, ""Twitter"")
        //System_Ext(github, ""GitHub"")
        //System_Ext(blogs, ""Blogs"")


        //Rel(anonymous_user, web_app, ""Uses"", ""HTTPS"")
        //Rel(aggregated_user, web_app, ""Uses"", ""HTTPS"")
        //Rel(administration_user, web_app, ""Uses"", ""HTTPS"")

        //Rel(web_app, rel_db, ""Reads from and writes to"", ""SQL/JDBC, port 3306"")
        //Rel(web_app, filesystem, ""Reads from"")
        //Rel(web_app, nosql, ""Reads from"", ""MongoDB wire protocol, port 27017"")

        //Rel_U(updater, rel_db, ""Reads from and writes data to"", ""SQL/JDBC, port 3306"")
        //Rel_U(updater, filesystem, ""Writes to"")
        //Rel_U(updater, nosql, ""Reads from and writes to"", ""MongoDB wire protocol, port 27017"")

        //Rel(updater, twitter, ""Gets profile information and tweets from"", ""HTTPS"")
        //Rel(updater, github, ""Gets information about public code repositories from"", ""HTTPS"")
        //Rel(updater, blogs, ""Gets content using RSS and Atom feeds from"", ""HTTP"")

        //Lay_R(rel_db, filesystem)

        //@enduml
        //";
        //            PlantUmlRenderer.Render(puml);
        //        }
    }

    public class DocumentSubmitBody {
        public string Path { get; set; }
        public string Namespace { get; set; }
        public string Code { get; set; }
    }
}
