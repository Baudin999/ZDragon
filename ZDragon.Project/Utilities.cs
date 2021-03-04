using System;
using System.IO;
using System.Text;


namespace ZDragon.Project {
    public static class Utilities {

        public static string GetNamespaceFromPath(string root, string path) {
            
            if (root == path) return "";

            var _path = Path.ChangeExtension(path, " ").Trim();
            if (Path.IsPathRooted(_path) && Path.IsPathRooted(root)) {
                _path = Path.GetRelativePath(root, _path);
                _path = _path.Replace(".", "_$_$_");
                _path = _path.Replace("\\", ".");
                _path = _path.Replace("\\", ".");
                return _path;
            }
            else {
                throw new Exception("Failed to create the Namespace fromt he paths: ");
            }

        }

        public static string GetPathFromNamespace(string root, string ns) {
            var _path =
                ns
                    .Replace(".", "\\")
                    .Replace("_$_$_", ".");
            _path = Path.Combine(root, ns);
            _path = Path.ChangeExtension(_path, ".car");
            return _path;
        }

        public static string CleanPath(string path) {
            // we don;t want:
            //    * spaces
            //    * ?

            return path.Replace(" ", "");
        }


    }
}
