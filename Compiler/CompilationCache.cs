using Compiler.Checkers;
using System.Collections.Generic;

namespace Compiler {
    public class CompilationCache {
        private readonly Dictionary<string, CompilationResult> Cache = new Dictionary<string, CompilationResult>();
        public ErrorSink ErrorSink { get; }

        public CompilationCache(ErrorSink errorSink) {
            this.ErrorSink = errorSink;
        }

        public void Add(string ns, CompilationResult result) {
            if (Has(ns)) {
                Cache[ns] = result;
            }
            else {
                Cache.Add(ns, result);
            }
        }

        public CompilationResult Get(string ns) {
            return Cache[ns];
        }

        public bool Has(string ns) {
            return Cache.ContainsKey(ns);
        }

        public int Count() {
            return Cache.Count;
        }

        public void TypeCheck() {
            foreach (var (key, compilationResult) in Cache) {
                new TypeChecker(this, compilationResult).Check();
            }
        }
    }
}
