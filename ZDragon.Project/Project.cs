using Compiler;
using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ZDragon.Project.Interactors;
using ZDragon.Project.Interactors.FileInteractors;
using ZDragon.Project.Interactors.MemoryInteractors;

namespace ZDragon.Project {
    public class Project : IDisposable {

        public static Project? CurrentProject;

        public CompilationCache Cache { get; private set; }
        private string _root { get; set; }
        private string outpath { get; set; }
        private string lucenePath { get; set; }
        private string imagesPath { get; set; }
        public string RootPath => _root;
        public IDirectoryInteractor DirectoryInteractor { get; private set; }

        public delegate void ProjectMessageHandler(object sender, MessageEventArgs args);
        public event ProjectMessageHandler? OnMessageSent;
        private  FileWatcher? watcher;

        public string OutPath => this.outpath;

        public Project(string root) {
            Cache = new CompilationCache(new ErrorSink());
            _root = root;
            outpath = Path.Combine(_root, "out");
            lucenePath = Path.Combine(outpath, "index");
            imagesPath = Path.Combine(_root, "images");


            if (!Directory.Exists(_root)) Directory.CreateDirectory(_root);

            watcher?.Dispose();
            watcher = new FileWatcher(_root);

            if (!Directory.Exists(outpath))
                Directory.CreateDirectory(outpath);

            if (!Directory.Exists(imagesPath))
                Directory.CreateDirectory(imagesPath);

            DirectoryInteractor = new FileDirectoryInteractor(root, root, Cache);

        }

        public Project() {
            Cache = new CompilationCache(new ErrorSink());
            var invalidString = "-,,%$^#%^invalid";
            _root = invalidString;
            outpath = invalidString;
            imagesPath = invalidString;
            lucenePath = invalidString;
            this.DirectoryInteractor = new MemoryDirectoryInteractor();
        }

        public void SendMessage(string message) {
            try {
                if (OnMessageSent != null)
                    OnMessageSent(this, new MessageEventArgs(message));
            }
            catch (Exception ex) {
                Console.WriteLine(ex.Message);
            }
        }

        public IDirectoryInteractor ResetDirectory() {
            this.DirectoryInteractor = new FileDirectoryInteractor(_root, _root, Cache);
            return this.DirectoryInteractor;
        }

        public bool IsValidProjectPath(string path) {
            return true;
        }

        public void Reload() {
            Reload(this.RootPath);
        }

        public void Reload(string path) {

            if (!Directory.Exists(path)) {
                Directory.CreateDirectory(path);
            }

            Cache = new CompilationCache(new ErrorSink());
            _root = path;
            outpath = Path.Combine(_root, "out");
            imagesPath = Path.Combine(_root, "Images");

            if (!Directory.Exists(outpath))
                Directory.CreateDirectory(outpath);

            if (!Directory.Exists(imagesPath)) {
                Directory.CreateDirectory(imagesPath);
                var img = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "standalone-icon.png");
                if (File.Exists(img)) {
                    File.Copy(img, imagesPath);
                }
            }

            DirectoryInteractor = new FileDirectoryInteractor(_root, _root, Cache);
                watcher?.Dispose();
                watcher = new FileWatcher(_root);
        }
        public void Unload() {
            Cache = new CompilationCache(new ErrorSink());
            var invalidString = "-,,%$^#%^invalid";
            _root = invalidString;
            outpath = invalidString;
            lucenePath = invalidString;
            imagesPath = invalidString;
            this.DirectoryInteractor = new MemoryDirectoryInteractor();
            //watcher?.Dispose();
        }

        public async Task<string> GetTextByNamespace(string ns) {
            var moduleInteractor = DirectoryInteractor.Find(ns);
            if (moduleInteractor is FileModuleInteractor mi)
                return await mi.GetTextAsync();

            throw new Exception("Cannot get the text of a non module interactor");
        }

        public async Task<IApplicationInteractor> CreateApplication(string name) {
            var appInteractor = await FileApplicationInteractor.Create(this._root, name, this.Cache);
            this.DirectoryInteractor.Applications.Add(appInteractor);
            return appInteractor;
        }

        public T? FindInteractorByNamespace<T>(string ns) where T : IInteractor {
            var interactor = DirectoryInteractor.Find(ns);
            return (T)interactor;
        }
        public IInteractor? FindInteractorByNamespace(string ns) {
            return DirectoryInteractor.Find(ns);
        }


        public Task<byte[]> GetImage(string file) {
            var fileName = Path.GetFileName(file);
            var imageFilePath = Path.Combine(imagesPath, fileName);
            if (File.Exists(imageFilePath)) {
                return File.ReadAllBytesAsync(imageFilePath);
            }


            throw new Exception("Not a valid file");
        }

        private IIdentifierExpressionNode? FindByTitle(string ns, string title) {
            if (Cache.Has(ns)) {
                var cache = Cache.Get(ns);

                if (cache is null) return null;

                foreach (var node in cache.Lexicon.Values) {
                    if (node is AttributesNode atsNode && atsNode.Title == title) {
                        var _ns = node.Imported && node.Namespace is not null ? node.Namespace : cache.Namespace;
                        if (atsNode.Title == title) return atsNode;
                    }
                    else if (node is IIdentifierExpressionNode idNode && idNode.Id == title) {
                        var _ns = node.Imported && node.Namespace is not null ? node.Namespace : cache.Namespace;
                        return node;
                    }
                };

            }
            return null;
        }


        public Fragment? FindFragment(string ns, string title) {
            if (Cache.Has(ns)) {
                var cache = Cache.Get(ns);
                var node = FindByTitle(ns, title);
                if (node is not null && cache is not null) {
                    var _ns = node.Imported && node.Namespace is not null ? node.Namespace : cache.Namespace;
                    return new Fragment(title, _ns, node.IdToken, 1);
                }
            }
            return null;
        }

        public IEnumerable<object> GetComponentInformation(string ns, string id) {
            if (Cache.Has(ns)) {
                var cache = Cache.Get(ns);

                var astNode = FindByTitle(ns, id);
                if (astNode is not null && astNode?.Namespace != ns && Cache.Has(astNode?.Namespace ?? "NOTHING__&&&")) {
                    cache = Cache.Get(astNode?.Namespace ?? ns);
                }
                if (astNode is not null) {

                    yield return new {
                        Id = id,
                        Literal = (astNode as AstNode)?.Hydrate() ?? "unknown",
                        Namespace = astNode.Imported ? astNode.Namespace : ns,
                        Position = astNode.IdToken
                    };


                    var found = false;
                    foreach (var node in cache.Ast) {
                        if (node is DirectiveNode diStart && diStart.Key == "region" && diStart.Value == astNode.Id) {
                            found = true;
                        }
                        if (node is DirectiveNode diEnd && diEnd.Key == "endregion" && diEnd.Value == astNode.Id) {
                            found = false;
                        }


                        if (found) {
                            if (node is ViewNode view) {
                                yield return new {
                                    IsImage = true,
                                    Url = $"/documents/{node.Namespace ?? cache.Namespace}/{view.HashString}.svg",
                                    Literal = view.Hydrate(),
                                    Namespace = node.Namespace ?? cache.Namespace,
                                    Id = view.Id,
                                    Position = view.IdToken
                                };
                            }
                            else if (node is IDocumentNode dn) {
                                yield return new {
                                    Literal = dn.Literal,
                                    Namespace = node.Namespace ?? cache.Namespace,
                                    Position = node.Segment
                                };
                            }
                        }
                    }
                }
            }
        }

        public void SaveIndex() {
            //
        }

        public List<Fragment> Search(string query) {
            return this.Cache.Search(query);
        }

        public void Dispose() {
            watcher?.Dispose();
        }
    }
}
