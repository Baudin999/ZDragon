using Compiler;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ZDragon.Project.Templates;

namespace ZDragon.Project.Interactors {
    public class ApplicationInteractor : IEquatable<ApplicationInteractor>, IInteractor {
        public string RootPath { get; }

        [JsonIgnore]
        public DirectoryInfo DirectoryInfo { get; }
        [JsonIgnore]
        private CompilationCache Cache { get; }
        public string FullPath { get; }
        public string Name { get; }
        public string Namespace { get; }

        /*
         * Architecturally speaking; an application consists of:
         *  * Components
         *  * EndPoints
         *  * Databases
         *  * Models
         * 
         */
        public string ComponentsPath { get; }
        public string EndpointsPath { get; }
        public string DatabasesPath { get; }
        public string ModelsPath { get; }
        public string FeaturesPath { get; }
        public string StoriesPath { get; }
        public List<ModuleInteractor> Modules { get; } = new List<ModuleInteractor>();

        public ApplicationInteractor(string root, string path, CompilationCache cache) : this(root, new DirectoryInfo(path), cache) {
            //
        }

        /// <summary>
        /// Default Constructor
        /// </summary>
        /// <param name="dir"></param>
        public ApplicationInteractor(string root, DirectoryInfo dir, CompilationCache cache) {
            this.RootPath = root;
            this.DirectoryInfo = dir;
            this.FullPath = dir.FullName;
            this.Name = dir.Name;
            this.Cache = cache;
            this.Namespace = Utilities.GetNamespaceFromPath(this.RootPath, dir.FullName);

            this.ComponentsPath = Path.Join(this.FullPath, "Components");
            this.EndpointsPath = Path.Join(this.FullPath, "Endpoints");
            this.DatabasesPath = Path.Join(this.FullPath, "Databases");
            this.ModelsPath = Path.Join(this.FullPath, "Models");
            this.FeaturesPath = Path.Join(this.FullPath, "Features");
            this.StoriesPath = Path.Join(this.FullPath, "Stories");

            this.ParseDirectory(this.RootPath, cache, FileTypes.Default);
            this.ParseDirectory(this.ComponentsPath, cache, FileTypes.Component);
            this.ParseDirectory(this.FeaturesPath, cache, FileTypes.Feature);
            this.ParseDirectory(this.EndpointsPath, cache, FileTypes.Endpoint);
            this.ParseDirectory(this.ModelsPath, cache, FileTypes.Model);
            this.ParseDirectory(this.DatabasesPath, cache, FileTypes.Database);
            this.ParseDirectory(this.StoriesPath, cache, FileTypes.Story);
        }

        private void ParseDirectory(string path, CompilationCache cache, FileTypes type) {
            if (!Directory.Exists(path)) Directory.CreateDirectory(path);
            foreach (var file in Directory.GetFiles(path)) {
                if (Path.GetExtension(file) == ".car") {
                    Modules.Add(new ModuleInteractor(this.RootPath, file, cache, type, this));
                }
            }
        }

        public async Task Verify() {
            foreach (var module in Modules) {
                if (module != null)
                    await module.Verify();
            }
        }

        public ModuleInteractor? Find(string ns) {
            return Modules.FirstOrDefault(m => m.Namespace == ns);
        }

        public Compiler.Index CreateIndex(FileTypes fileType) {
            var modules = Modules.Where(m => m.FileType == fileType).Select(m => m.Namespace).ToArray();
            var index = this.Cache.GenerateComponentIndex(modules);
            return index;
        }

        public static List<ApplicationInteractor> FromDirectory(string root, string path, CompilationCache cache) {

            var applications = new List<ApplicationInteractor>();
            if (Directory.Exists(path)) {
                var directory = new DirectoryInfo(path);
                foreach (var dir in directory.GetDirectories()) {
                    applications.Add(new ApplicationInteractor(root, dir, cache));
                }
            }

            return applications;
        }

        public static ApplicationInteractor Create(string root, string name, CompilationCache cache) {
            name = name.Replace(" ", "");
            var fullPath = Path.Combine(Path.GetFullPath(root), name);

            // either create or load the ApplicationInteractor
            DirectoryInfo dirInfo =
                Directory.Exists(fullPath) ?
                    new DirectoryInfo(fullPath) :
                    Directory.CreateDirectory(fullPath);

            var configPath = Path.Combine(fullPath, "app.config");
            if (!File.Exists(configPath)) File.Create(configPath);

            return new ApplicationInteractor(root, dirInfo, cache);
        }

        public static bool IsApplication(string root, string name) {
            name = name.Replace(" ", "");
            var fullPath = Path.Combine(Path.GetFullPath(root), name, "app.config");
            return File.Exists(fullPath);
        }

        public bool Equals(ApplicationInteractor? other) {
            if (other is null) return false;
            else {
                return other.FullPath == this.FullPath;
            }
        }


        // IInteractor methods

        public async Task<ModuleInteractor> AddFile(string name, string type, string? description) {
            // Should be added to the application or directory of which this file is a part.
            string fileName = name;
            if (!fileName.EndsWith(".car")) fileName = fileName + ".car";

            var path = type switch {
                "Feature" => Path.Combine(this.FeaturesPath, fileName),
                "Endpoint" => Path.Combine(this.EndpointsPath, fileName),
                "Database" => Path.Combine(this.DatabasesPath, fileName),
                "Model" => Path.Combine(this.ModelsPath, fileName),
                "Story" => Path.Combine(this.StoriesPath, fileName),
                "Component" => Path.Combine(this.ComponentsPath, fileName),
                _ => Path.Combine(this.DirectoryInfo.FullName ?? this.RootPath, fileName)
            };

            var template = type switch {
                "Feature" => FeatureTemplates.Default(name),
                "Endpoint" => EndpointTemplates.Default(name),
                "Database" => DatabaseTemplates.Default(name),
                "Component" => ComponentTemplates.Default(name),
                _ => $"# {name}"
            };

            await File.WriteAllTextAsync(path, template);
            var moduleInteractor = new ModuleInteractor(this.RootPath, path, this.Cache);
            this.Modules.Add(moduleInteractor);
            return moduleInteractor;
        }
    }
}
