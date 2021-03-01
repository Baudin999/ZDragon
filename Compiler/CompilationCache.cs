using Compiler.Checkers;
using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Compiler {
    public class CompilationCache {
        private readonly Dictionary<string, CompilationResult> Cache = new Dictionary<string, CompilationResult>();
        public ErrorSink ErrorSink { get; }
        public Dictionary<string, IIdentifierExpressionNode> Lexicon = new Dictionary<string, IIdentifierExpressionNode>();

        public CompilationCache(ErrorSink errorSink) {
            this.ErrorSink = errorSink;
        }

        public void ClearErrors() {
            ErrorSink.Reset();
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
            ErrorSink.Reset();
            foreach (var (key, compilationResult) in Cache) {
                new TypeChecker(this, compilationResult).Check();
            }
        }

        public Index GenerateComponentIndex(params string[] namespaces) {
            var result = new Index();

            foreach (string ns in namespaces) {
                if (Cache.ContainsKey(ns)) {
                    foreach (var (key, value) in Cache[ns].Lexicon) {
                        if (value is IArchitectureNode && !value.Imported)
                            result.Add(key, ns + "." + key, value);
                    }
                }
            }
            return result;
        }

        public Index GenerateLanguageIndex(params string[] namespaces) {
            var result = new Index();

            foreach (string ns in namespaces) {
                if (Cache.ContainsKey(ns)) {
                    foreach (var (key, value) in Cache[ns].Lexicon) {
                        if (value is ILanguageNode && !value.Imported) {
                            result.Add(key, ns + "." + key, value);
                        }
                    }
                }
            }
            return result;
        }
    }
}
