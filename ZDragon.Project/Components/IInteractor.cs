using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ZDragon.Project.Components {
    public interface IInteractor {
        Task<ModuleInteractor> AddFile(string name, string type, string? description);
    }
}
