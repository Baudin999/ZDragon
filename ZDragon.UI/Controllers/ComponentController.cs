using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;

namespace ZDragon.UI.Controllers {
    public class ComponentController : Controller {
        private readonly Project.Project _project;

        public ComponentController(Project.Project project) {
            _project = project;
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
                System.Console.WriteLine(ex.Message);
                return Problem(
                  title: $"Failed to get the fragment"
                  );
            }
        }
    }
}
