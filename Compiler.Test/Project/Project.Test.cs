using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using Xunit.Priority;
using ZDragon.Project.Interactors;

namespace Project {

    [TestCaseOrderer(PriorityOrderer.Name, PriorityOrderer.Assembly)]
    public class Project : IDisposable {

        private static readonly string appName = "First";
        private static readonly string componentFileName = "FirstComponent";
        private static readonly string componentNamespace = "First.Components.FirstComponent";

        private readonly string _root;
        private readonly ZDragon.Project.Project _project;
        private IModuleInteractor? moduleInteractor;

        public Project() {
            _root = Path.Combine(Directory.GetCurrentDirectory(), "proj" + Guid.NewGuid());
            if (Directory.Exists(_root)) Directory.Delete(_root, true);
            _project = new ZDragon.Project.Project(_root);
        }

        public void Dispose() {
            _project.Dispose();
            Directory.Delete(_root, true);
        }

        [Fact(DisplayName = "Project - Create Application"), Priority(0)]
        public async void Project_CreateApplication() {
            Assert.Empty(_project.DirectoryInteractor.Applications);
            var result = _project.CreateApplication(appName);
            Assert.NotNull(result);
            
            await Task.Delay(200);
            Assert.Single(_project.DirectoryInteractor.Applications);

            var interactor = _project.DirectoryInteractor.Applications.First();
            Assert.Equal(appName, interactor.Namespace);
            Assert.True(Directory.Exists(interactor.FullPath));
            Assert.True(Directory.Exists(interactor.ComponentsPath));
            Assert.True(Directory.Exists(interactor.DocumentationPath));
            Assert.True(Directory.Exists(interactor.FeaturesPath));
            Assert.True(Directory.Exists(interactor.EndpointsPath));
            Assert.True(Directory.Exists(interactor.DatabasesPath));
            Assert.True(Directory.Exists(interactor.StoriesPath));
            Assert.True(File.Exists(interactor.SettingsPath));
        }

        [Fact(DisplayName = "Project - Create Component"), Priority(10)]
        public async void Project_CreateComponent() {
            var app = _project.CreateApplication(appName);
            moduleInteractor = await app.AddFile(componentFileName, "Component", null);
            Assert.NotNull(moduleInteractor);
            Assert.True(File.Exists(moduleInteractor.FullName));
        }

        [Fact(DisplayName = "Project - Compile Code"), Priority(20)]
        public async void Project_CompileCode() {
            var app = _project.CreateApplication(appName);
            await app.AddFile(componentFileName, "Component", null);
            
            // test to see if we can get the module interactor
            var moduleInteractor = _project.FindInteractorByNamespace<IModuleInteractor>(componentNamespace);
            Assert.NotNull(moduleInteractor);
            if (moduleInteractor is null) throw new Exception("Will never be thrown");

            // save the code and check if the files exist.
            var moduleInteractor2 = await moduleInteractor.SaveModule(@"
# This is a chapter

component Foo =
    Title: Bar
");
            // first we test if the module interactor is the result of adding the module to
            // the application interactor
            Assert.NotNull(moduleInteractor2);

            // Now we check if the file actually exists.
            Assert.True(File.Exists(moduleInteractor.FullName));
            Assert.True(File.Exists(moduleInteractor2.FullName));

            // test if in the 'out' folder the components.svg, the data.svg and the planning.svg 
            // files exists.
            Assert.True(File.Exists(Path.Combine(_project.OutPath, moduleInteractor.Namespace, "components.svg")));
            Assert.True(File.Exists(Path.Combine(_project.OutPath, moduleInteractor2.Namespace, "components.svg")));

            Assert.Equal(2, moduleInteractor2.CompilationResult.Ast.Count);
            Assert.Single(moduleInteractor2.CompilationResult.Lexicon);
            Assert.Single(moduleInteractor2.CompilationResult.Document);

        }

        private IApplicationInteractor createApp() {
            var app = _project.FindInteractorByNamespace<IApplicationInteractor>(appName);
            if (app is not null) return app;
            else {
                return _project.CreateApplication(appName);
            }
        }
    }
}
