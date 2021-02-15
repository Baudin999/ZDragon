using Compiler;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Woezel.Project.Components;
using Woezel.Transpilers.Components;
using Woezel.Transpilers.Html;
using Woezel.Transpilers.PlantUML;

namespace Woezel.Project {
    public class Project {
        public readonly CompilationCache Cache = new CompilationCache(new ErrorSink());
        private readonly string _root;
        private readonly string outpath;
        private readonly string dbPath;
        private readonly Dictionary<string, FInfo> mapping = new Dictionary<string, FInfo>();
        public DInfo Dir { get; }

        public List<DomainInteractor> Domains { get; } = new List<DomainInteractor>();

        public Project(string root) {
            _root = root;
            outpath = Path.Combine(_root, "out");
            dbPath = Path.Combine(outpath, "store.db");

           
            if (!Directory.Exists(outpath))
                Directory.CreateDirectory(outpath);


            var domains = new Dictionary<string, DomainInteractor> {
                { "Marketing", DomainInteractor.Create(root, "Marketing") }
            };
            var interactor = DomainInteractor.Create(root, "Offering");
            interactor.CreateApplication("UPS");
            interactor.CreateApplication("Identification Services");
            interactor.CreateApplication("OfferStore");

            domains.Add("Offering", interactor);
            domains.Add("Contracting", DomainInteractor.Create(root, "Contracting"));
            domains.Add("Metering", DomainInteractor.Create(root, "Metering"));
            domains.Add("Debt Management", DomainInteractor.Create(root, "Debt Management"));
            domains.Add("Invoicing", DomainInteractor.Create(root, "Invoicing"));
            domains.Add("Customer", DomainInteractor.Create(root, "Customer"));
            

            foreach (var directory in Directory.GetDirectories(_root)) {
                var dInfo = new DirectoryInfo(directory);
                Domains.Add(new DomainInteractor(root, dInfo.Name));
            }

            Dir = getDirectoryInfo(_root);


        }

        public bool IsValidProjectPath(string path) {
            return path.StartsWith(_root);

        }

        public string getNamespace(string path) {

            if (!path.EndsWith(".car")) return path;

            var p = path
                .Replace(_root, "")
                .Replace("/", ".")
                .Replace("\\", ".")
                .Replace(".car", "")
                .Substring(1);
            return p;
        }

        private string getPathByNamespace(string ns) {
            return $"{_root}/{ns.Replace(".", "/")}.car";
        }
 

        public async Task<string> GetTextByNamespace(string ns) {
            if (mapping.ContainsKey(ns)) {
                return await mapping[ns].GetText();
            }
            return "";
        }

        public async Task<string> GetTextByPath(string path) {
            return await File.ReadAllTextAsync(path);
        }

        private DInfo getDirectoryInfo(string path) {

            var dInfo = new DirectoryInfo(path);

            List<FInfo> files = new List<FInfo>();
            foreach (string d in Directory.GetFiles(path)) {
                var _fInfo = new FileInfo(d);
                var fInfo = new FInfo(_fInfo, getNamespace(_fInfo.FullName));

                if (_fInfo.Extension == ".car") {
                    fInfo.Namespace = getNamespace(fInfo.Path);
                    mapping.Add(fInfo.Namespace, fInfo);

                    if (fInfo.IsCarFile()) {
                        //Task.Run(() => {
                            var code = File.ReadAllText(fInfo.Path);
                            var compilationResult = new Compiler.Compiler(code).Compile();
                            Cache.Add(fInfo.Namespace, compilationResult);
                            Console.WriteLine($"Compiled '{fInfo.Namespace}'");
                        //});
                    }
                }
                files.Add(fInfo);
            }

            List<DInfo> directories = new List<DInfo>();
            foreach (string d in Directory.GetDirectories(path)) {
                var dirInfo = getDirectoryInfo(d);
                directories.Add(dirInfo);
            }

            return new DInfo(dInfo.Name, path, files, directories);
        }

        public string GetHtml(string ns) {
            var compilationResult = Cache.Get(ns);
            return new HtmlTranspiler().Go(Cache, compilationResult);
        }

        public async Task<string> SaveFile(string path, string text) {
            await File.WriteAllTextAsync(path, text);
            return text;
        }

        public async Task<FInfo> CreateFile(string ns, string text = "") {
            var path = getPathByNamespace(ns);
            await File.WriteAllTextAsync(path, text);

            return new FInfo(new FileInfo(path), ns);
        }

        public FInfo? GetFileInfo(string ns) {
            if (mapping.ContainsKey(ns))
                return mapping[ns];
            else
                return null;
        }

        public CompilationResult Compile(FInfo fInfo, string code, CompilationCache cache) {
            //
            return new Compiler.Compiler(code, fInfo.Namespace, cache).Compile().Check(cache);
        }

        public async Task SaveCompilerResult(FInfo fInfo, CompilationResult compilationResult) {
            try {
                Cache.Add(fInfo.Namespace, compilationResult);

                var svgPath = Path.Combine(outpath, "data.svg");
                var puml = new PlantUmlTranspiler(compilationResult).Transpile();
                _ = File.WriteAllBytesAsync(svgPath, await PlantUmlRenderer.Render(puml));

                var componentSvgPath = Path.Combine(outpath, "components.svg");
                var pumlC = new ComponentTranspiler(compilationResult).Transpile();
                _ = File.WriteAllBytesAsync(componentSvgPath, await PlantUmlRenderer.Render(pumlC));
            }
            catch (Exception ex) {
                Console.WriteLine(ex.Message);
            }
        }

        public CompilationResult? GetCompilationResult(string ns) {
            return Cache.Get(ns);
        }

        public async Task<byte[]> GetSvg(string ns) {
            try {
                if (mapping.ContainsKey(ns)) { 
                    var fInfo = mapping[ns];
                    var path = Path.Combine(outpath, fInfo.Namespace + ".svg");
                    return await File.ReadAllBytesAsync(path);
                }
                else {
                    var path = Path.Combine(outpath, ns + ".svg");
                    return await File.ReadAllBytesAsync(path);
                }
            }
            catch (Exception ex) {
                Console.WriteLine(ex.Message);
                return Array.Empty<byte>();
            }
        }


        public class DInfo {
            public string Name { get; }
            public string Path { get; }
            public List<FInfo> Files { get; }
            public List<DInfo> Directories { get; }
            public DInfo(string name, string path, List<FInfo> files, List<DInfo> directories) {
                this.Name = name;
                this.Path = path;
                this.Files = files;
                this.Directories = directories;
            }
        }

        public class FInfo {
            public string Name { get; }
            public string Path { get; }
            public string Namespace { get; set; }
            public string Id { get; }
            public DateTime ChangedOn { get; }
            public DateTime CreatedOn { get; }
            public string LastChangedFormatted { get; }
            public bool IsCarFile() => Path.EndsWith(".car");

            public FInfo(FileInfo fileInfo, string ns) {
                this.Namespace = ns;
                this.Name = fileInfo.Name;
                this.Path = fileInfo.FullName;
                this.ChangedOn = fileInfo.LastWriteTime;
                this.CreatedOn = fileInfo.CreationTime;

                this.Id = $"{Namespace}::{Name}";
            }
            public async Task<string> GetText() {
                return await File.ReadAllTextAsync(this.Path);
            }
        }
    }
}
