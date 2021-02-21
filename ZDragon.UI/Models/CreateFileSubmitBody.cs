using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ZDragon.UI.Models {
    public class CreateFileSubmitBody {
        public string Name { get; set; }
        public string Type { get; set; }
        public string AppName { get; set; }
        public string Description { get; set; }
    }
}
