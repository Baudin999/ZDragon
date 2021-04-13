using Compiler.Checkers;
using Compiler.Language.Nodes;
using Compiler.Symbols;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Compiler {
    public class CompilationCache {
        private readonly Dictionary<string, CompilationResult> Cache = new Dictionary<string, CompilationResult>();
        internal ErrorSink ErrorSink { get; }
        public Dictionary<string, IIdentifierExpressionNode> Lexicon = new Dictionary<string, IIdentifierExpressionNode>();
        public List<Error> Errors => ErrorSink.Errors;

        public Index ArchitectureNodes => GenerateComponentIndex(Cache.Keys.ToArray());
        public Index LanguageNodes => GenerateLanguageIndex(Cache.Keys.ToArray());

        /// <summary>
        /// NEEDS TO BE REMOVED!!!
        /// DEPRECATE ASAP!!!
        /// </summary>
        public List<CompilationResult> Values { get; }

        public CompilationCache(ErrorSink errorSink) {
            this.ErrorSink = errorSink;
        }

        public void Reset() {
            this.ClearErrors();
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

            foreach (string ns in namespaces.Where(n => n != null)) {
                if (Cache.ContainsKey(ns)) {
                    foreach (var (key, value) in Cache[ns].Lexicon) {
                        if (value is IArchitectureNode a && !value.Imported) {
                            var indexItem = new IndexItem(key, ns + "." + key, value) {
                               //
                            };

                            result.Add(indexItem);
                        }
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

        public List<Fragment> Search(string query) {
            var aggregate = new List<Fragment>();
            Console.WriteLine($"cache: {Cache.Values.Count()}");
            foreach (var cache in Cache.Values) {
                var nodes = cache
                    .Ast
                    .OfType<IIdentifierExpressionNode>()
                    .Where(n => !n.Imported)
                    .Where(n => n is not OpenNode)
                    .Where(n => n.Id.Contains(query, StringComparison.InvariantCultureIgnoreCase))
                    .Select(n => {
                        var isSame = query.Equals(n.Id, StringComparison.InvariantCultureIgnoreCase);
                        var startsWith = cache.Namespace.StartsWith(query, StringComparison.InvariantCultureIgnoreCase);
                        var score = isSame ? 1 :
                                        startsWith ? 0.7 :
                                            0.2;

                        return new Fragment(
                            n.Id, 
                            cache.Namespace, 
                            n.IdToken,
                            score
                            );
                    });
                aggregate.AddRange(nodes);
            }
            return aggregate.OrderByDescending(n => n.Score).ThenBy(n => n.Id).ToList();
        }
    }

    public class Fragment {
        public string Id { get; }
        public ISourceSegment Position { get; }
        public string Namespace { get; }
        public double Score { get; }

        public Fragment(string id, string ns, ISourceSegment segment, double score) {
            this.Id = id;
            this.Position = segment;
            this.Namespace = ns;
            this.Score = score;
        }

    }
}
