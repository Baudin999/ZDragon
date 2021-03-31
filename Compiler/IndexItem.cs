using Compiler.Language.Nodes;
using System;

namespace Compiler {
    public class IndexItem: IEquatable<string> {
        public string Key { get; }
        public string QualifiedName { get; }
        public string FileName { get; set; } = default!;
        public string Hash { get; set; } = default!;
        public string ProjectName { get; set; } = default!;
        public string ApplicationName { get; set; } = default!;
        public string FileType { get; set; } = default!;

        public IIdentifierExpressionNode Node { get; }
        public IndexItem(string key, string qualifiedName, IIdentifierExpressionNode node) {
            this.Key = key;
            this.QualifiedName = qualifiedName;
            this.Node = node;
        }

        public override bool Equals(object? obj) {
            if (obj is IndexItem idi) {
                return idi.QualifiedName == this.QualifiedName;
            }
            else {
                return base.Equals(obj);
            }
        }

        public bool Equals(string? other) {
            return this.QualifiedName == other;
        }

        public override int GetHashCode() {
            return this.QualifiedName.GetHashCode();
        }

        public override string ToString() {
            return this.QualifiedName;
        }
    }
}
