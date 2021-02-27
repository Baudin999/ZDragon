using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ZDragon.Project.Interactors {
    public interface IInteractor {
        Task<ModuleInteractor> AddFile(string name, string type, string? description);
    }
}
