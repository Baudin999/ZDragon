using Compiler;
using System.Collections.Generic;
using System.Threading.Tasks;
using ZDragon.Project.Interactors.FileInteractors;

namespace ZDragon.Project.Interactors {
    public interface IModuleInteractor : IInteractor {

        IApplicationInteractor? ApplicationInteractor { get; }
        FileTypes FileType { get; }
        string Namespace { get; }
        CompilationResult CompilationResult { get; }
        string FullName { get; }

        Task<CompilationResult> Compile();
        CompilationResult Compile(string s);
        void Publish();
        List<VersionUrl> GetVersionUrls();
        Task<byte[]> GetComponentModelSvg();
        Task<byte[]> GetDataModelSvg();
        Task<byte[]> GetHtml();
        Task<byte[]?> GetSvg(string file);
        Task<string> GetTextAsync();
        Task<IModuleInteractor> SaveModule(string s);
        Task Verify();
    }
}