using System.Collections.Generic;

namespace ZDragon.Project.Interactors {
    public interface IDirectoryInteractor : IInteractor {
        List<IApplicationInteractor> Applications { get; }
        List<IModuleInteractor> Modules { get; }

        IInteractor? Find(string ns);
    }
}