using Compiler;
using System.Collections.Generic;
using System.Threading.Tasks;
using ZDragon.Project.Interactors.FileInteractors;

namespace ZDragon.Project.Interactors {
    public interface IApplicationInteractor : IInteractor {
        List<IModuleInteractor> Modules { get; }
        string Namespace { get; }

        Task<FileModuleInteractor> AddFile(string name, string type, string? description);
        Index CreateIndex(FileTypes fileType);
        IModuleInteractor? Find(string ns);
        Task Verify();
    }
}