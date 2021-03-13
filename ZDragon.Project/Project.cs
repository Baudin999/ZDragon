using Compiler;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using ZDragon.Project.Interactors;
using ZDragon.Transpilers.Components;
using ZDragon.Transpilers.Html;
using ZDragon.Transpilers.PlantUML;

namespace ZDragon.Project {
    public class Project {
        public CompilationCache Cache { get; private set;}
        private string _root { get; set; }
        private string outpath { get; set; }
        private string dbPath { get; set;}
        private string imagesPath { get; set; }
        public string RootPath => _root;
        public DirectoryInteractor DirectoryInteractor { get; private set;  }


        public Project(string root) {
            Cache = new CompilationCache(new ErrorSink());
            _root = root;
            outpath = Path.Combine(_root, "out");
            dbPath = Path.Combine(outpath, "store.db");
            imagesPath = Path.Combine(_root, "Images");


            if (!Directory.Exists(outpath))
                Directory.CreateDirectory(outpath);

            if (!Directory.Exists(imagesPath))
                Directory.CreateDirectory(imagesPath);

            DirectoryInteractor = new DirectoryInteractor(root, root, Cache);
        }

        public DirectoryInteractor ResetDirectory() {
            this.DirectoryInteractor = new DirectoryInteractor(_root, _root, Cache);
            return this.DirectoryInteractor;
        }

        public bool IsValidProjectPath(string path) {
            return true;
        }

        public void Reload(string path) {
            Cache = new CompilationCache(new ErrorSink());
            _root = path;
            outpath = Path.Combine(_root, "out");
            dbPath = Path.Combine(outpath, "store.db");
            imagesPath = Path.Combine(_root, "Images");

            DirectoryInteractor = new DirectoryInteractor(_root, _root, Cache);
        }

        public async Task<string> GetTextByNamespace(string ns) {
            var moduleInteractor = DirectoryInteractor.Find(ns);
            if (moduleInteractor is ModuleInteractor mi)
                return await mi.GetText();

            throw new Exception("Cannot get the text of a non module interactor");
        }

        public bool CreateApplication(string name) {
            var appInteractor = ApplicationInteractor.Create(this._root, name, this.Cache);
            return appInteractor != null;
        }

        public T? Find<T>(string ns) where T: IInteractor {
            var interactor =  DirectoryInteractor.Find(ns);
            return (T)interactor;
        }
        public IInteractor? Find(string ns) {
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
    }

}
