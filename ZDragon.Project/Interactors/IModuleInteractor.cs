using Compiler;
using System.Threading.Tasks;
using ZDragon.Project.Interactors.FileInteractors;

namespace ZDragon.Project.Interactors {
    public interface IModuleInteractor : IInteractor {

        IApplicationInteractor? ApplicationInteractor { get; }
        FileTypes FileType { get; }
        string Namespace { get; }

        Task<CompilationResult> Compile();
        CompilationResult Compile(string s);
        Task<byte[]> GetComponentModelSvg();
        Task<byte[]> GetDataModelSvg();
        Task<byte[]> GetHtml();
        Task<byte[]?> GetSvg(string file);
        Task<string> GetText();
        Task<FileModuleInteractor> SaveModule(string s);
        Task Verify();
    }
}