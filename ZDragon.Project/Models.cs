using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ZDragon.Project {
    public class Domain {
        public string Name { get; set; } = default!;
        public string FullPath { get; set; } = default!;
        public string Path { get; set; } = default!;

        public DomainConfiguration Configuration { get; set; } = default!;
    }

    public class DomainConfiguration {
        public bool RenderClassDiagram { get; set; }
    }
}
