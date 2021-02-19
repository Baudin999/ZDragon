using Compiler;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace ZDragon.Project.Components {
    public class DirectoryInteractor {
        public string RootPath { get; }
        public string DirectoryPath { get; }
        public string Namespace { get; }
        public List<ApplicationInteractor> Applications { get; } = new List<ApplicationInteractor>();
        public List<ModuleInteractor> Modules { get; } = new List<ModuleInteractor>();

        [JsonIgnore]
        private readonly CompilationCache cache;

        public DirectoryInteractor(string root, string path, CompilationCache cache) {
            this.cache = cache;
            this.RootPath = root;
            this.DirectoryPath = Path.IsPathFullyQualified(path) ? path : Path.GetFullPath(path);
            this.Namespace = Utilities.GetNamespaceFromPath(root, path);

            foreach (var dir in Directory.GetDirectories(this.DirectoryPath)) {
                if (dir.EndsWith("out")) continue;
                Applications.Add(new ApplicationInteractor(this.RootPath, dir, cache));
            }

            foreach (var file in Directory.GetFiles(this.DirectoryPath)) {
                Modules.Add(new ModuleInteractor(this.RootPath, file, cache));
            }
        }

        public void Verify() {
            foreach (var module in Modules) module.Verify();
            foreach (var application in Applications) application.Verify();
        }

        public DirectoryInteractor CreateApplication(string name) {
            var appInteractor = ApplicationInteractor.Create(this.RootPath, name, cache);
            this.Applications.Add(appInteractor);
            return this;
        }

        public ModuleInteractor Find(string ns) {
            var module = Modules.FirstOrDefault(m => m.Namespace == ns);
            if (module == null) {
                foreach (var application in Applications.Where(a => a.Namespace.StartsWith(ns))) {
                    module = application.Find(ns);
                    if (module != null) return module;
                }
            }
            return module;
        }


        /// <summary>
        /// Not sure how to solve this...
        /// </summary>
        /// <param name="root"></param>
        /// <param name="name"></param>
        /// <returns></returns>
        public static DirectoryInteractor Create(string root, string name, CompilationCache cache) {
            return new DirectoryInteractor(root, name, cache);
        }
    }
}
