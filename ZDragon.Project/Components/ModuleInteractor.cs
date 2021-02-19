using Compiler;
using Newtonsoft.Json;
using System.IO;
using System.Threading.Tasks;
using ZDragon.Transpilers.Components;
using ZDragon.Transpilers.Html;
using ZDragon.Transpilers.PlantUML;

namespace ZDragon.Project.Components {
    /// <summary>
    /// The module interactor gives us a way to interact with a module,
    /// like saving the file, compiling the module and gerally maintain
    /// the validity of the diagrams created by the module.
    /// </summary>
    public class ModuleInteractor {
        public string RootPath { get; }
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

        public ModuleInteractor(string rootPath, string file, CompilationCache cache) {

            this.cache = cache;

            this.RootPath = rootPath;
            this.FullName = file;
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
            this.DocumentHash = Utilities.HashString(text);
            this.CompilationResult = new Compiler.Compiler(text, this.Namespace, cache).Compile();
        }

        public async Task<string> GetText() {
            var text = await File.ReadAllTextAsync(this.FullName);
            return text;
        }

        public ModuleInteractor SaveModule(string s) {
            var newHash = Utilities.HashString(s);
            if (!Utilities.HashCompare(newHash, this.DocumentHash)) {
                _ = File.WriteAllTextAsync(this.FullName, s);
                this.DocumentHash = newHash;

                // reset the previous Compiltation Errors
                this.cache.ErrorSink.Reset();

                // also compile on save
                this.CompilationResult = Compile(s);
                _ = SaveDataModelSvg();
                _ = SaveComponentModelSvg();
                SaveHtml();
            }

            return this;
        }

        public async void Verify() {
            this.CompilationResult = await Compile();
            if (!File.Exists(this.DataSvgPath)) await SaveDataModelSvg();
            if (!File.Exists(this.ComponentsSvgPath)) await SaveComponentModelSvg();
            if (!File.Exists(this.HtmlPath)) SaveHtml();
        }

        public async Task<CompilationResult> Compile() {
            // reset the previous Compiltation Errors
            this.cache.ErrorSink.Reset();

            var text = await GetText();
            this.CompilationResult = new Compiler.Compiler(text, this.Namespace, cache).Compile().Check();
            System.Console.WriteLine($"Successfully compiled '{this.Namespace}' with {this.CompilationResult.Errors.Count} errors.");
            return this.CompilationResult;
        }

        public CompilationResult Compile(string s) {
            // reset the previous Compiltation Errors
            this.cache.ErrorSink.Reset();

            this.CompilationResult = new Compiler.Compiler(s, this.Namespace, cache).Compile().Check();
            System.Console.WriteLine($"Successfully compiled '{this.Namespace}' with {this.CompilationResult.Errors.Count} errors.");
            return this.CompilationResult;
        }

        public async Task SaveDataModelSvg() {

            System.Console.WriteLine("Generating new data model for: " + this.Namespace);
            var svgPath = Path.Combine(this.OutPath, "data.svg");
            var puml = new PlantUmlTranspiler(this.CompilationResult).Transpile();
            _ = File.WriteAllBytesAsync(svgPath, await PlantUmlRenderer.Render(puml));
        }
        public async Task<byte[]> GetDataModelSvg() {
            var svgPath = Path.Combine(this.OutPath, "data.svg");
            if (!File.Exists(svgPath)) await SaveDataModelSvg();
            return await File.ReadAllBytesAsync(svgPath);
        }

        public async Task SaveComponentModelSvg() {
            System.Console.WriteLine("Generating new component model for: " + this.Namespace);
            var svgPath = Path.Combine(this.OutPath, "components.svg");
            var puml = new ComponentTranspiler(this.CompilationResult).Transpile();
            _ = File.WriteAllBytesAsync(svgPath, await PlantUmlRenderer.Render(puml));
        }
        public async Task<byte[]> GetComponentModelSvg() {
            var svgPath = Path.Combine(this.OutPath, "components.svg");
            if (!File.Exists(svgPath)) await SaveComponentModelSvg();
            return await File.ReadAllBytesAsync(svgPath);
        }

        public void SaveHtml() {
            var svgPath = Path.Combine(this.OutPath, "page.html");
            var html = new HtmlTranspiler(this.CompilationResult).Transpile();
            _ = File.WriteAllBytesAsync(svgPath, Utilities.StringToByteArray(html));
        }
        public async Task<byte[]> GetHtml() {
            var htmlPath = Path.Combine(this.OutPath, "page.html");
            if (!File.Exists(htmlPath)) SaveHtml();
            return await File.ReadAllBytesAsync(htmlPath);
        }



    }
}
