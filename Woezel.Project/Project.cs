using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Woezel.Project {
    public class Project {

        private readonly string _root;
        public DInfo Dir { get; }

        public Project(string root) {
            _root = root;
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

        private FInfo? FindFileByNamespace(DInfo dInfo, string ns) {
            FInfo? file = null;
            foreach (var f in dInfo.Files) {
                if (f.Namespace == ns) {
                    file = f;
                    break;
                }
            }
            if (file is null) {
                foreach (var d in dInfo.Directories) {
                    var f = FindFileByNamespace(d, ns);
                    if (file is null) file = f;
                }
            }
            return file;
        }
 
        public async Task<string> GetTextByNamespace(string ns) {
            var fInfo = FindFileByNamespace(Dir, ns);
            if (fInfo != null) {
                return await fInfo.GetText();
            }
            else {
                return "";
            }
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

        public async Task<string> SaveFile(string path, string text) {
            await File.WriteAllTextAsync(path, text);
            return text;
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
