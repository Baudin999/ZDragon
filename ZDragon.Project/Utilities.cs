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

        public static byte[] StringToByteArray(string s) {
            return ASCIIEncoding.ASCII.GetBytes(s);
        }

        public static string ByteArrayToString(byte[] arrInput) {
            int i;
            StringBuilder sOutput = new StringBuilder(arrInput.Length);
            for (i = 0; i < arrInput.Length - 1; i++) {
                sOutput.Append(arrInput[i].ToString("X2"));
            }
            return sOutput.ToString();
        }

        public static bool HashCompare(byte[] h1, byte[] h2) {
            bool bEqual = false;
            if (h2.Length == h1.Length) {
                int i = 0;
                while ((i < h2.Length) && (h2[i] == h1[i])) {
                    i += 1;
                }
                if (i == h2.Length) {
                    bEqual = true;
                }
            }
            return bEqual;
        }

        public static byte[] HashString(string s) {
            var sha256 = System.Security.Cryptography.SHA256.Create();
            return sha256.ComputeHash(StringToByteArray(s));
        }

       

    }
}
