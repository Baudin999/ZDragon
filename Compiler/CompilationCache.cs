using System.Collections.Generic;

namespace Compiler {
    public class CompilationCache {
        private static readonly Dictionary<string, CompilationResult> Cache = new Dictionary<string, CompilationResult>();

        public static void Add(string ns, CompilationResult result) {
            if (Has(ns)) {
                Cache[ns] = result;
            }
            else {
                Cache.Add(ns, result);
            }
        }

        public static CompilationResult Get(string ns) {
            return Cache[ns];
        }

        public static bool Has(string ns) {
            return Cache.ContainsKey(ns);
        }
    }
}
