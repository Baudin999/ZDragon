using Compiler;
using System.Collections.Generic;
using System.Threading.Tasks;
using ZDragon.Project.Interactors.FileInteractors;

namespace ZDragon.Project.Interactors {
    public interface IApplicationInteractor : IInteractor {
        List<IModuleInteractor> Modules { get; }
        string Namespace { get; }
        ApplicationSettings ApplicationSettings { get; }
        string FullPath { get; }
        string ComponentsPath { get; }
        string EndpointsPath { get; }
        string DatabasesPath { get; }
        string ModelsPath { get; }
        string FeaturesPath { get; }
        string StoriesPath { get; }
        string DocumentationPath { get; }
        string SettingsPath { get; }

        Task<FileModuleInteractor> AddFile(string name, string type, string? description);
        Task Compile();
        Index CreateIndex(FileTypes fileType);
        IModuleInteractor? Find(string ns);
        Task Verify();
    }
}