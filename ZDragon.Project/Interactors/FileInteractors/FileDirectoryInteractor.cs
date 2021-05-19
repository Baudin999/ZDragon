using Compiler;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace ZDragon.Project.Interactors.FileInteractors {
    public class FileDirectoryInteractor : IDirectoryInteractor {
        public string RootPath { get; }
        public string DirectoryPath { get; }
        public string Namespace { get; }
        public List<IApplicationInteractor> Applications { get; } = new List<IApplicationInteractor>();
        public List<IModuleInteractor> Modules { get; } = new List<IModuleInteractor>();

        [JsonIgnore]
        private readonly CompilationCache cache;

        public FileDirectoryInteractor(string root, string path, CompilationCache cache) {
            this.cache = cache;
            this.RootPath = Utilities.GetFullPath(root);
            this.DirectoryPath = Utilities.GetFullPath(path);
            this.Namespace = Utilities.GetNamespaceFromPath(root, path);

            foreach (string dir in Directory.GetDirectories(this.DirectoryPath)) {
                if (FileApplicationInteractor.IsApplication(this.DirectoryPath, dir)) {
                    ZDragon.Project.Project.CurrentProject?.SendMessage($"Initializing Application: {dir}");
                    Applications.Add(new FileApplicationInteractor(this.RootPath, dir, cache));
                }
            }

            foreach (var file in Directory.GetFiles(this.DirectoryPath)) {
                if (Path.GetExtension(file) == ".car") {
                    Modules.Add(new FileModuleInteractor(this.RootPath, file, cache));
                }
            }
        }

        public IInteractor? Find(string ns) {
            // Check if this directory is the interactor we need.
            if (this.Namespace == ns || ns is null) return this;

            // check the modules
            var module = Modules.FirstOrDefault(m => m.Namespace == ns);
            if (module == null) {

                // check the applications
                foreach (var application in Applications.Where(a => ns.StartsWith(a.Namespace))) {
                    if (application.Namespace == ns) return application;

                    // check each module in the application
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
        public static FileDirectoryInteractor Create(string root, string name, CompilationCache cache) {
            return new FileDirectoryInteractor(root, name, cache);
        }

    }
}
