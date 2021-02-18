using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ZDragon.Project {
    public class Domain {
        public string Name { get; set; }
        public string FullPath { get; set; }
        public string Path { get; set; }

        public DomainConfiguration Configuration { get; set; }
    }

    public class DomainConfiguration {
        public bool RenderClassDiagram { get; set; }
    }
}
