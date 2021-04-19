using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace ZDragon.UI.Controllers {
    public class ComponentController : Controller {
        private readonly ILogger<DocumentController> _logger;
        private readonly Project.Project _project;
        private readonly ProjectHub ProjectHub;


        public ComponentController(ILogger<DocumentController> logger, Project.Project project, ProjectHub hub) {
            _logger = logger;
            _project = project;

            this.ProjectHub = hub;
        }

        [HttpGet("/api/component/info/{ns}/{id}")]
        public IActionResult GetComponentRefactoring(string ns, string id) {
            try {
                var region = _project.GetComponentInformation(ns, id).ToList();
                if (region is not null && region.Count > 0) {
                    return Ok(region);
                }
                else {
                    return NotFound();
                }
            }
            catch (System.Exception ex) {
                return Problem(
                  title: $"Failed to get the fragment"
                  );
            }
        }
    }
}
