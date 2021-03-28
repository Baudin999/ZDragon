using System.Collections.Generic;

namespace ZDragon.Project.Interactors.MemoryInteractors {
    public class MemoryDirectoryInteractor : IDirectoryInteractor {
        public MemoryDirectoryInteractor() {
            //
        }

        public List<IApplicationInteractor> Applications => throw new System.NotImplementedException();

        public List<IModuleInteractor> Modules => throw new System.NotImplementedException();

        public IInteractor? Find(string ns) {
            return null;
        }
    }
}
