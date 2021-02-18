using System;
using System.IO;

namespace ZDragon.Project {
    public static class Utilities {

        public static string GetNamespaceFromPath(string root, string path) {

            var p = Path.IsPathFullyQualified(path);
            var p2 = Path.IsPathRooted(path);
            var p3 = Path.DirectorySeparatorChar;
            var _t = path.Replace(root, "");
            var __t = Path.GetRelativePath(root, path);

            var _path = Path.ChangeExtension(path, null);
            if (Path.IsPathRooted(path) && Path.IsPathRooted(root)) {
                _path = Path
                    .GetRelativePath(root, path)
                     .Replace(".", "_$_$_")
                    .Replace("\\", ".");
                return _path;
            }
            else {
                throw new Exception("Failed to create the Namespace fromt he paths: ");
            }

        }

        public static string GetpathFromNamespace(string root, string ns) {
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

        internal static object GetNamespaceFromPath(string domainPath) {
            throw new System.NotImplementedException();
        }
    }
}
