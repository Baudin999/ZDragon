using Compiler;
using Compiler.Language.Nodes;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ZDragon.Project.Templates;
using ZDragon.Transpilers.Components;
using ZDragon.Transpilers.Html;
using ZDragon.Transpilers.Planning;
using ZDragon.Transpilers.PlantUML;

namespace ZDragon.Project.Interactors {
    /// <summary>
    /// The module interactor gives us a way to interact with a module,
    /// like saving the file, compiling the module and gerally maintain
    /// the validity of the diagrams created by the module.
    /// </summary>
    public class ModuleInteractor : IInteractor {
        public string Name { get; }
        public string RootPath { get; }
        public string? DirectoryPath { get; }
        public string OutPath { get; }
        public string DataSvgPath { get; }
        public string ComponentsSvgPath { get; }
        public byte[] DocumentHash { get; private set; }

        [JsonIgnore]
        private readonly CompilationCache cache;

        [JsonIgnore]
        public CompilationResult CompilationResult { get; private set; }

        // paths
        public string HtmlPath { get; }
        public string FullName { get; }
        public string Namespace { get; }
        public FileTypes FileType { get; }

        [JsonIgnore]
        public ApplicationInteractor? ApplicationInteractor { get; }

        public ModuleInteractor(string rootPath, string file, CompilationCache cache, FileTypes fileType, ApplicationInteractor app) : this(rootPath, file, cache) {
            if (cache is null) throw new System.Exception("Compilation Cache cannot be null");
            this.FileType = fileType;
            this.ApplicationInteractor = app;
        }

        public ModuleInteractor(string rootPath, string file, CompilationCache cache) {
            if (cache is null) throw new System.Exception("Compilation Cache cannot be null");
            this.cache = cache;

            this.FileType = FileTypes.Default;
            this.ApplicationInteractor = null;

            this.RootPath = rootPath;
            this.FullName = file;
            this.Name = Path.GetFileNameWithoutExtension(file);
            this.DirectoryPath = Path.GetDirectoryName(file);
            this.Namespace = Utilities.GetNamespaceFromPath(rootPath, file);
            this.OutPath = Path.Combine(rootPath, "out", this.Namespace);
            this.DataSvgPath = Path.Combine(this.OutPath, "data.svg");
            this.ComponentsSvgPath = Path.Combine(this.OutPath, "components.svg");
            this.HtmlPath = Path.Combine(this.OutPath, "page.html");

            if (!Directory.Exists(this.OutPath)) Directory.CreateDirectory(this.OutPath);

            // Compile source-code
            var text = "";
            if (File.Exists(this.FullName)) {
                text = File.ReadAllText(this.FullName);
            }
            this.DocumentHash = Compiler.Utilities.HashString(text);
            this.CompilationResult = new Compiler.Compiler(text, this.Namespace, cache).Compile();
        }

        public async Task<string> GetText() {
            var text = await File.ReadAllTextAsync(this.FullName);
            return text;
        }

        public async Task<ModuleInteractor> SaveModule(string s) {
            List<Task> tasks = new List<Task>();

            var newHash = Compiler.Utilities.HashString(s);
            if (!Compiler.Utilities.HashCompare(newHash, this.DocumentHash)) {
                tasks.Add(File.WriteAllTextAsync(this.FullName, s));
                this.DocumentHash = newHash;

                // also compile on save
                this.CompilationResult = Compile(s);
                tasks.Add(SaveDataModelSvg());
                tasks.Add(SaveComponentModelSvg());
                tasks.Add(SaveRoadmapSvg());
                tasks.Add(SaveViews());
                tasks.Add(SaveHtml());
            }

            await Task.WhenAll(tasks.ToArray());

            return this;
        }

        public async Task Verify() {
            this.CompilationResult = await Compile();
            if (!File.Exists(this.DataSvgPath)) await SaveDataModelSvg();
            if (!File.Exists(this.ComponentsSvgPath)) await SaveComponentModelSvg();
            if (!File.Exists(this.HtmlPath)) await SaveHtml();
        }

        public async Task<CompilationResult> Compile() {
            try {
                // reset the previous Compiltation Errors
                this.cache.Reset();

                var text = await GetText();
                this.CompilationResult = new Compiler.Compiler(text, this.Namespace, cache).Compile().Check();
                ZDragon.Project.Project.CurrentProject.SendMessage($"Successfully compiled '{this.Namespace}' with {this.CompilationResult.Errors.Count} errors.");
                return this.CompilationResult;
            }
            catch (System.Exception ex) {
                ZDragon.Project.Project.CurrentProject.SendMessage(@$"
Failed to compile '{this.Namespace}':

{ex.Message}
");

                return this.CompilationResult;
            }
        }

        public CompilationResult Compile(string s) {
            try {
                // reset the previous Compiltation Errors
                this.cache.Reset();
                this.CompilationResult = new Compiler.Compiler(s, this.Namespace, cache).Compile().Check();
                ZDragon.Project.Project.CurrentProject.SendMessage($"Successfully compiled '{this.Namespace}' with {this.CompilationResult.Errors.Count} errors.");
                return this.CompilationResult;
            }
            catch (System.Exception ex) {
                ZDragon.Project.Project.CurrentProject.SendMessage(@$"
Failed to compile '{this.Namespace}':

{ex.Message}
");
                return this.CompilationResult;
            }
        }

        public async Task SaveDataModelSvg() {
            try {
                var svgPath = Path.Combine(this.OutPath, "data.svg");
                var puml = new ClassDiagramTranspiler(this.CompilationResult.Lexicon).Transpile();
                await File.WriteAllBytesAsync(svgPath, await PlantUmlRenderer.Render(puml));
            }
            catch (System.Exception) {
                //
            }
        }
        public async Task<byte[]> GetDataModelSvg() {
            var svgPath = Path.Combine(this.OutPath, "data.svg");
            if (!File.Exists(svgPath)) await SaveDataModelSvg();
            return await File.ReadAllBytesAsync(svgPath);
        }

        public async Task SaveComponentModelSvg() {
            try {
                var svgPath = Path.Combine(this.OutPath, "components.svg");
                var puml = new ComponentTranspiler(this.CompilationResult.Lexicon).Transpile();
                await File.WriteAllBytesAsync(svgPath, await PlantUmlRenderer.Render(puml));
            }
            catch (System.Exception) {
                //
            }
        }

        public async Task SaveRoadmapSvg() {
            try {
                var svgPath = Path.Combine(this.OutPath, "roadmap.svg");
                var lexicon = this.CompilationResult.Lexicon.Select(x => x.Value).OfType<IPlanningNode>().ToList();
                var puml = new PlanningTranspiler(lexicon).Transpile();
                await File.WriteAllBytesAsync(svgPath, await PlantUmlRenderer.Render(puml));
            }
            catch (System.Exception) {
                //
            }
        }

        public async Task SaveViews() {
            List<Task> tasks = new List<Task>();
            // Create the views
            var names = new List<string> {
                "components.svg",
                "data.svg",
                "roadmap.svg",
                "page.html"
            };
            foreach (var view in this.CompilationResult.Lexicon.Where(l => l.Value is ViewNode).Select(l => (ViewNode)l.Value)) {
                var viewLexicon = new Dictionary<string, IIdentifierExpressionNode>();
                foreach (var node in view.Nodes) {
                    if (this.CompilationResult.Lexicon.ContainsKey(node.Value)) {
                        viewLexicon.Add(node.Value, this.CompilationResult.Lexicon[node.Value]);
                    }
                }


                if (viewLexicon?.FirstOrDefault().Value is IArchitectureNode) {
                    var _puml = new ComponentTranspiler(viewLexicon).Transpile();
                    var path = Path.Combine(this.OutPath, view.Hash + ".svg");
                    tasks.Add(File.WriteAllBytesAsync(path, await PlantUmlRenderer.Render(_puml)));
                    names.Add(view.Hash + ".svg");
                }
                else {
                    var _puml = new ClassDiagramTranspiler(viewLexicon).Transpile();
                    var path = Path.Combine(this.OutPath, view.Hash + ".svg");
                    tasks.Add(File.WriteAllBytesAsync(path, await PlantUmlRenderer.Render(_puml)));
                    names.Add(view.Hash + ".svg");
                }
            }

            foreach (var file in Directory.GetFiles(this.OutPath)) {
                if (!names.Contains(Path.GetFileName(file))) {
                    File.Delete(file);
                }
            }

            await Task.WhenAll(tasks);
        }

        public async Task<byte[]> GetComponentModelSvg() {
            var svgPath = Path.Combine(this.OutPath, "components.svg");
            if (!File.Exists(svgPath)) await SaveComponentModelSvg();
            return await File.ReadAllBytesAsync(svgPath);
        }
        public async Task<byte[]?> GetSvg(string file) {
            var svgPath = Path.Combine(this.OutPath, file + ".svg");
            if (!File.Exists(svgPath)) return null;
            else return await File.ReadAllBytesAsync(svgPath);
        }

        public async Task SaveHtml() {
            var svgPath = Path.Combine(this.OutPath, "page.html");
            var html = new HtmlTranspiler(this.CompilationResult).Transpile();
            await File.WriteAllBytesAsync(svgPath, Compiler.Utilities.StringToByteArray(html));
        }
        public async Task<byte[]> GetHtml() {
            var htmlPath = Path.Combine(this.OutPath, "page.html");
            if (!File.Exists(htmlPath)) await SaveHtml();
            return await File.ReadAllBytesAsync(htmlPath);
        }


        // IInteractor methods

        public async Task<ModuleInteractor> AddFile(string name, string type, string? description) {
            // Should be added to the application or directory of which this file is a part.
            name = name.Replace(" ", "");
            string fileName = name;
            if (!fileName.EndsWith(".car")) fileName = fileName + ".car";
            var path = Path.Combine(this.DirectoryPath ?? this.RootPath, fileName);

            var template = "";
            if (type == "Feature") {
                template = FeatureTemplates.Default(name);
            }

            await File.WriteAllTextAsync(path, template);
            return new ModuleInteractor(this.RootPath, path, cache);

        }

    }
}
