using Compiler;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using ZDragon.Project.Components;
using ZDragon.Transpilers.Components;
using ZDragon.Transpilers.Html;
using ZDragon.Transpilers.PlantUML;

namespace ZDragon.Project {
    public class Project {
        public readonly CompilationCache Cache;
        private readonly string _root;
        private readonly string outpath;
        private readonly string dbPath;
        public DirectoryInteractor DirectoryInteractor { get; }


        public Project(string root) {
            Cache = new CompilationCache(new ErrorSink());
            _root = root;
            outpath = Path.Combine(_root, "out");
            dbPath = Path.Combine(outpath, "store.db");


            if (!Directory.Exists(outpath))
                Directory.CreateDirectory(outpath);

            DirectoryInteractor = new DirectoryInteractor(root, root, Cache);
        }

        public bool IsValidProjectPath(string path) {
            return true;
        }

        public async Task<string> GetTextByNamespace(string ns) {
            var moduleInteractor = DirectoryInteractor.Find(ns);
            return await moduleInteractor.GetText();
        }

        public ModuleInteractor? Find(string ns) {
            return DirectoryInteractor.Find(ns);
        }
    }

}
