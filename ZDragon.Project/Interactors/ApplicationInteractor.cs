using Compiler;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ZDragon.Project.Templates;

namespace ZDragon.Project.Interactors {
    public class ApplicationInteractor: IEquatable<ApplicationInteractor>, IInteractor {
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

            if (!Directory.Exists(this.ComponentsPath)) Directory.CreateDirectory(this.ComponentsPath);
            if (!Directory.Exists(this.EndpointsPath)) Directory.CreateDirectory(this.EndpointsPath);
            if (!Directory.Exists(this.DatabasesPath)) Directory.CreateDirectory(this.DatabasesPath);
            if (!Directory.Exists(this.ModelsPath)) Directory.CreateDirectory(this.ModelsPath);
            if (!Directory.Exists(this.FeaturesPath)) Directory.CreateDirectory(this.FeaturesPath);

            foreach (var file in Directory.GetFiles(this.FullPath)) {
                Modules.Add(new ModuleInteractor(this.RootPath, file, cache));
            }
            foreach (var file in Directory.GetFiles(this.ComponentsPath)) {
                Modules.Add(new ModuleInteractor(this.RootPath, file, cache, FileTypes.Component));
            }
            foreach (var file in Directory.GetFiles(this.EndpointsPath)) {
                Modules.Add(new ModuleInteractor(this.RootPath, file, cache, FileTypes.Endpoint));
            }
            foreach (var file in Directory.GetFiles(this.DatabasesPath)) {
                Modules.Add(new ModuleInteractor(this.RootPath, file, cache, FileTypes.Database));
            }
            foreach (var file in Directory.GetFiles(this.ModelsPath)) {
                Modules.Add(new ModuleInteractor(this.RootPath, file, cache, FileTypes.Model));
            }
            foreach (var file in Directory.GetFiles(this.FeaturesPath)) {
                Modules.Add(new ModuleInteractor(this.RootPath, file, cache, FileTypes.Feature));
            }
        }

        public void Verify() {
            foreach (var module in Modules) module.Verify();
        }

        public ModuleInteractor? Find(string ns) {
            return Modules.FirstOrDefault(m => m.Namespace == ns);
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
            var fullPath = Path.Combine(Path.GetFullPath(root), name);

            // either create or load the ApplicationInteractor
            DirectoryInfo dirInfo =
                Directory.Exists(fullPath) ?
                    new DirectoryInfo(fullPath) :
                    Directory.CreateDirectory(fullPath);
            return new ApplicationInteractor(root, dirInfo, cache);        }

        public bool Equals(ApplicationInteractor other) {
            return other.FullPath == this.FullPath;
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
