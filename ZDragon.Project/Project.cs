using Compiler;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ZDragon.Project.Interactors;
using ZDragon.Project.Interactors.FileInteractors;
using ZDragon.Project.Interactors.MemoryInteractors;

namespace ZDragon.Project {
    public class Project {

        public static Project? CurrentProject;

        public CompilationCache Cache { get; private set;}
        private string _root { get; set; }
        private string outpath { get; set; }
        private string dbPath { get; set;}
        private string imagesPath { get; set; }
        public string RootPath => _root;
        public IDirectoryInteractor DirectoryInteractor { get; private set;  }

        public delegate void ProjectMessageHandler(object sender, MessageEventArgs args);
        public event ProjectMessageHandler? OnMessageSent;


        public Project(string root) {
            Cache = new CompilationCache(new ErrorSink());
            _root = root;
            outpath = Path.Combine(_root, "out");
            dbPath = Path.Combine(outpath, "store.db");
            imagesPath = Path.Combine(_root, "images");


            if (!Directory.Exists(outpath))
                Directory.CreateDirectory(outpath);

            if (!Directory.Exists(imagesPath))
                Directory.CreateDirectory(imagesPath);

            DirectoryInteractor = new FileDirectoryInteractor(root, root, Cache);
        }

        public Project(bool inMemory) {
            Cache = new CompilationCache(new ErrorSink());
            var invalidString = "-,,%$^#%^invalid";
            _root = invalidString;
            outpath = invalidString;
            dbPath = invalidString;
            imagesPath = invalidString;
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

        public void Reload(string path) {
            if (path != this.RootPath) {
                Cache = new CompilationCache(new ErrorSink());
                _root = path;
                outpath = Path.Combine(_root, "out");
                dbPath = Path.Combine(outpath, "store.db");
                imagesPath = Path.Combine(_root, "Images");

                DirectoryInteractor = new FileDirectoryInteractor(_root, _root, Cache);
            }
        }

        public async Task<string> GetTextByNamespace(string ns) {
            var moduleInteractor = DirectoryInteractor.Find(ns);
            if (moduleInteractor is FileModuleInteractor mi)
                return await mi.GetText();

            throw new Exception("Cannot get the text of a non module interactor");
        }

        public bool CreateApplication(string name) {
            var appInteractor = FileApplicationInteractor.Create(this._root, name, this.Cache);
            return appInteractor != null;
        }

        public T? Find<T>(string ns) where T: IInteractor {
            var interactor =  DirectoryInteractor.Find(ns);
            return (T)interactor;
        }
        public IInteractor? Find(string ns) {
            return DirectoryInteractor.Find(ns);
        }

        public IEnumerable<NodeDescriptor> GetComponentNodes() {
            var modules = DirectoryInteractor.Applications.SelectMany(a => a.Modules).Select(m => m.Namespace).ToArray();
            var index = this.Cache.GenerateComponentIndex(modules);

            foreach (var node in index) {
                yield return new NodeDescriptor {
                    Name = node.Key,
                    Namespace = node.QualifiedName
                };
            }
        }

        public Task<byte[]> GetImage(string file) {
            var fileName = Path.GetFileName(file);
            var imageFilePath = Path.Combine(imagesPath, fileName);
            if (File.Exists(imageFilePath)) {
                return File.ReadAllBytesAsync(imageFilePath);
            }


            throw new Exception("Not a valid file");
        }
    }

    public class NodeDescriptor {
        public string Name { get; set; } = default!;
        public string Namespace { get; set; } = default!;
        public string ProjectName { get; set; } = default!;
        public string ApplicationName { get; set; } = default!;
        public string FileName { get; set; } = default!;

    }
}
