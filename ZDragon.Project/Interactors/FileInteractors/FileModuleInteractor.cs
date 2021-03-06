using Compiler;
using Compiler.Language.Nodes;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ZDragon.Project.Templates;
using ZDragon.Transpilers.Components;
using ZDragon.Transpilers.Html;
using ZDragon.Transpilers.Planning;
using ZDragon.Transpilers.PlantUML;

namespace ZDragon.Project.Interactors.FileInteractors {
    /// <summary>
    /// The module interactor gives us a way to interact with a module,
    /// like saving the file, compiling the module and gerally maintain
    /// the validity of the diagrams created by the module.
    /// </summary>
    public class FileModuleInteractor : IModuleInteractor {
        public string Name { get; }
        public string RootPath { get; }
        public string? DirectoryPath { get; }
        public string OutPath { get; }
        public string DataSvgPath { get; }
        public string ComponentsSvgPath { get; }
        public byte[] DocumentHash { get; private set; }

        [JsonIgnore]
        public bool RenderLocal { get; }

        [JsonIgnore]
        private readonly CompilationCache cache;

        [JsonIgnore]
        public CompilationResult CompilationResult { get; private set; }

        // paths
        public string HtmlPath { get; }
        public string FullName { get; }
        public string Namespace { get; }
        public FileTypes FileType { get; }

        private byte[]? componentsHash = null;
        private byte[]? dataHash = null;
        private byte[]? roadmapHash = null;
        private Dictionary<string, byte[]> ViewHashes { get; } = new Dictionary<string, byte[]>();

        [JsonIgnore]
        public IApplicationInteractor? ApplicationInteractor { get; }

        public FileModuleInteractor(string rootPath, string file, CompilationCache cache, FileTypes fileType, FileApplicationInteractor app) : this(rootPath, file, cache) {
            if (cache is null) throw new System.Exception("Compilation Cache cannot be null");
            this.FileType = fileType;
            this.ApplicationInteractor = app;
            // this.RenderLocal = this.ApplicationInteractor?.ApplicationSettings.RenderLocal ?? false;
            this.RenderLocal = false;
        }

        public FileModuleInteractor(string rootPath, string file, CompilationCache cache) {
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

        public async Task<string> GetTextAsync() {
            if (File.Exists(this.FullName)) {
                var text = await File.ReadAllTextAsync(this.FullName);
                return text;
            }
            else {
                return "";
            }
        }
        public string GetText() {
            if (File.Exists(this.FullName)) {
                return File.ReadAllText(this.FullName);
            }
            else {
                return "";
            }
        }

        public async Task<IModuleInteractor> SaveModule(string s) {
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

                var text = await GetTextAsync();
                this.CompilationResult = new Compiler.Compiler(text, this.Namespace, cache).Compile().Check();
                InterpolateDocumentNodes();

                Project.CurrentProject?.SendMessage($"Successfully compiled '{this.Namespace}' with {this.CompilationResult.Errors.Count} errors.");
                return this.CompilationResult;
            }
            catch (System.Exception ex) {
                Project.CurrentProject?.SendMessage(@$"
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
                InterpolateDocumentNodes();
                CopyViewSvgs();

                return this.CompilationResult;
            }
            catch (System.Exception ex) {
                ZDragon.Project.Project.CurrentProject?.SendMessage(@$"
Failed to compile '{this.Namespace}':

{ex.Message}
");
                return this.CompilationResult;
            }
        }

        private void InterpolateDocumentNodes() {
            // format the document nodes
            foreach (var documentNode in this.CompilationResult.Document) {
                if (documentNode.IsTemplate) {
                    var _compilationResult = (documentNode.OriginalNamespace is not null && cache.Has(documentNode.OriginalNamespace))
                        ? cache.Get(documentNode.OriginalNamespace)
                        : this.CompilationResult;

                    var lexicon = _compilationResult.Lexicon;

                    documentNode.InterpolatedContent = CarTemplating.FormatTemplate(documentNode.Content, lexicon);
                }
            }
        }

        private void CopyViewSvgs() {
            foreach (var documentNode in this.CompilationResult.Document.OfType<ViewNode>().Where(v => v.Imported)) {
                if (documentNode.OriginalNamespace is not null) {
                    var publish_directory = Path.Combine(this.RootPath, "out", this.Namespace);
                    var origin_publish_directory = Path.Combine(this.RootPath, "out", documentNode.OriginalNamespace);
                    var svg_path = Path.Combine(origin_publish_directory, documentNode.HashString + ".svg");
                    var new_svg_path = Path.Combine(publish_directory, documentNode.HashString + ".svg");
                    if (File.Exists(svg_path)) {
                        File.Copy(svg_path, new_svg_path, true);
                    }
                }
                
            }
        }

        public void Publish() {
            //
            if (this.DirectoryPath is null) return;

            var our_directory = Path.Combine(this.RootPath, "out", this.Namespace);
            
            // GET THE RIGHT VERSION NUMBER
            var directories = new DirectoryInfo(our_directory)
                .GetDirectories()
                .Where(dir => {
                    return dir.Name.StartsWith("v");
                });

            var version_number = 0;
            var last_version = directories.OrderByDescending(f => f.Name).FirstOrDefault();
            if (last_version is not null) {

                // we do not want duplicate versions in our version store. This is why we will
                // check the contents to see if it's the same...
                var previous_text = File.ReadAllText(Path.Combine(last_version.FullName, this.Name + ".car"));
                var previous_hash = Compiler.Utilities.HashString(previous_text);
                var is_equal = Compiler.Utilities.HashCompare(previous_hash, this.DocumentHash);

                if (!is_equal) {
                    if (int.TryParse(last_version.Name.Replace("v", ""), out version_number)) {
                        version_number++;
                    }

                    var publish_directory = Path.Combine(our_directory, $"v{version_number}");
                    if (!Directory.Exists(publish_directory)) Directory.CreateDirectory(publish_directory);

                    File.WriteAllText(Path.Combine(publish_directory, this.Name + ".car"), this.GetText());
                    foreach (var file in new DirectoryInfo(our_directory).GetFiles()) {
                        File.Copy(file.FullName, Path.Combine(publish_directory, file.Name));
                    }
                }
            }
            else {
                var publish_directory = Path.Combine(our_directory, $"v{version_number}");
                if (!Directory.Exists(publish_directory)) Directory.CreateDirectory(publish_directory);

                File.WriteAllText(Path.Combine(publish_directory, this.Name + ".car"), this.GetText());
                foreach (var file in new DirectoryInfo(our_directory).GetFiles()) {
                    File.Copy(file.FullName, Path.Combine(publish_directory, file.Name));
                }
            }
        }

        public List<VersionUrl> GetVersionUrls() {
            if (this.DirectoryPath is null) return new List<VersionUrl>();

            var our_directory = Path.Combine(this.RootPath, "out", this.Namespace);

            // GET THE RIGHT VERSION NUMBER
            var directories = new DirectoryInfo(our_directory)
                .GetDirectories()
                .Where(dir => {
                    return dir.Name.StartsWith("v");
                })
                .Select(dInfo => {
                    var version_root_url = dInfo.FullName;
                    return new VersionUrl {
                        Version = dInfo.Name,
                        CodeUrl = Path.Combine(version_root_url, this.Name + ".car"),
                        ComponentUrl = Path.Combine(version_root_url, "components.svg"),
                        DataUrl = Path.Combine(version_root_url, "data.svg"),
                        HtmlUrl = Path.Combine(version_root_url, "index.html")
                    };
                })
                .ToList();

            return directories;
        }

        public async Task SaveDataModelSvg() {
            try {
                var svgPath = Path.Combine(this.OutPath, "data.svg");
                var puml = new ClassDiagramTranspiler(this.CompilationResult.Lexicon).Transpile();
                var newHash = Compiler.Utilities.HashString(puml);
                if (dataHash is null || !Compiler.Utilities.HashCompare(newHash, dataHash)) {
                    await File.WriteAllBytesAsync(svgPath, PlantUmlRenderer.Render(puml, RenderLocal));
                    dataHash = newHash;
                }
            }
            catch (System.Exception ex) {
                System.Console.WriteLine(ex);
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
                var newHash = Compiler.Utilities.HashString(puml);
                if (componentsHash is null || !Compiler.Utilities.HashCompare(newHash, componentsHash)) {
                    await File.WriteAllBytesAsync(svgPath, PlantUmlRenderer.Render(puml, RenderLocal));
                    componentsHash = newHash;
                }
            }
            catch (System.Exception ex) {
                System.Console.WriteLine(ex);
            }
        }

        public async Task SaveRoadmapSvg() {
            try {
                var svgPath = Path.Combine(this.OutPath, "roadmap.svg");
                var lexicon = this.CompilationResult.Lexicon.Select(x => x.Value).OfType<IPlanningNode>().ToList();
                var puml = new PlanningTranspiler(lexicon).Transpile();
                var newHash = Compiler.Utilities.HashString(puml);
                if (roadmapHash is null || !Compiler.Utilities.HashCompare(newHash, roadmapHash)) {
                    await File.WriteAllBytesAsync(svgPath, PlantUmlRenderer.Render(puml, RenderLocal));
                    roadmapHash = newHash;
                }
            }
            catch (System.Exception) {
                //
            }
        }

        public async Task SaveViews() {
            List<Task> tasks = new List<Task>();

            // the default names of the file which are for 
            var names = new List<string> {
                "components.svg",
                "data.svg",
                "roadmap.svg",
                "page.html"
            };

            foreach (var view in this.CompilationResult.Lexicon.Where(l => l.Value is ViewNode).Select(l => (ViewNode)l.Value)) {
                names.Add(view.HashString + ".svg");
                tasks.Add(SaveView(names, view));
            }

            // delete all the views which are no longer applicable.
            foreach (var file in Directory.GetFiles(this.OutPath)) {

                // names now contains all of the "default" names of the files
                // and the view names based on the hash.
                // we itterate all of the files on the directory, each file
                // we can't match to a name in the names collection will be
                // removed
                if (!names.Contains(Path.GetFileName(file)) && !file.Contains(this.Name + "_v")) {
                    File.Delete(file);
                }
            }

            await Task.WhenAll(tasks);
        }

        private Task SaveView(List<string> names, ViewNode view) {

            Task task = Task.Delay(0);

            var viewLexicon = new Dictionary<string, IIdentifierExpressionNode>();
            foreach (var node in view.Nodes) {
                if (this.CompilationResult.Lexicon.ContainsKey(node.Id)) {
                    var copy = this.CompilationResult.Lexicon[node.Id].Copy();
                    if (copy is AttributesNode _node) {
                        foreach (var attrib in node.Attributes) {
                            _node.SetAttribute(attrib);
                        }
                    }
                    viewLexicon.Add(node.Id, (IIdentifierExpressionNode)copy);
                }
            }

            string? _puml = null;
            if (viewLexicon?.FirstOrDefault().Value is IArchitectureNode) {
                _puml = new ComponentTranspiler(viewLexicon).Transpile();
            }
            else if (viewLexicon?.FirstOrDefault().Value is ILanguageNode) {
                _puml = new ClassDiagramTranspiler(viewLexicon).Transpile();
            }


            if (_puml is not null) {
                var newHash = Compiler.Utilities.HashString(_puml);
                if (!ViewHashes.ContainsKey(view.HashString) || !Compiler.Utilities.HashCompare(ViewHashes[view.HashString], newHash)) {
                    var path = Path.Combine(this.OutPath, view.HashString + ".svg");
                    task = Task.Run(async () => {
                        await File.WriteAllBytesAsync(path, PlantUmlRenderer.Render(_puml, RenderLocal));
                    });
                    //task = File.WriteAllBytesAsync(path, await PlantUmlRenderer.Render(_puml, RenderLocal));
                    names.Add(view.HashString + ".svg");
                    ViewHashes[view.HashString] = newHash;
                }
                else {
                    names.Add(view.HashString + ".svg");
                }
            }

            return task;
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
            await Task.Delay(100);
        }
        public async Task<byte[]> GetHtml() {
            var canOpen = false;
            var attempt = 0;
            Exception? exception = null;

            while (!canOpen || attempt < 10) {
                try {
                    var htmlPath = Path.Combine(this.OutPath, "page.html");
                    if (!File.Exists(htmlPath)) await SaveHtml();
                    var result = await File.ReadAllBytesAsync(htmlPath);
                    canOpen = true;
                    return result;
                }
                catch (Exception ex) {
                    attempt++;
                    exception = ex;
                }
            }

            throw exception ?? new Exception("Failed to open html for reading");
        }


        // IInteractor methods

        //public async Task<IModuleInteractor> AddFile(string name, string type, string? description) {
        //    // Should be added to the application or directory of which this file is a part.
        //    name = name.Replace(" ", "");
        //    string fileName = name;
        //    if (!fileName.EndsWith(".car")) fileName = fileName + ".car";
        //    var path = Path.Combine(this.DirectoryPath ?? this.RootPath, fileName);

        //    var template = "";
        //    if (type == "Feature") {
        //        template = FeatureTemplates.Default(name);
        //    }

        //    await File.WriteAllTextAsync(path, template);
        //    return new FileModuleInteractor(this.RootPath, path, cache);

        //}

    }
}
