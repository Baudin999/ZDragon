using System.Collections.Generic;

namespace ZDragon.Project.Interactors.MemoryInteractors {
    public class MemoryDirectoryInteractor : IDirectoryInteractor {
        public MemoryDirectoryInteractor() {
            //
        }

        public List<IApplicationInteractor> Applications => new List<IApplicationInteractor>();

        public List<IModuleInteractor> Modules => new List<IModuleInteractor>();

        public IInteractor? Find(string ns) {
            return null;
        }
    }
}
