using Compiler.Language.Nodes;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Compiler {
    public class Index : IList<IndexItem> {

        private readonly List<IndexItem> _list = new List<IndexItem>();

        public IndexItem this[int index] { get => _list[index]; set => _list[index] = value; }

        public int Count => _list.Count;

        public bool IsReadOnly => true;

        public void Add(string key, string qualifiedName, IIdentifierExpressionNode node) {
            if (!_list.Any(i => i.QualifiedName == qualifiedName)) {
                _list.Add(new IndexItem(key, qualifiedName, node));
            }
        }

        public void Add(IndexItem item) {
            if (!_list.Any(i => i.QualifiedName == item.QualifiedName)) {
                _list.Add(item);
            }
        }

        public void Clear() {
            _list.Clear();
        }

        public bool Contains(IndexItem item) {
            return _list.Contains(item);
        }

        public bool Contains(string qualifiedName) {
            return _list.Any(i => i.QualifiedName == qualifiedName);
        }

        public IndexItem? Find(string qualifiedName) {
            return _list.FirstOrDefault(q => q.QualifiedName == qualifiedName);
        }
        public List<IndexItem> FindByName(string name) {
            return _list.FindAll(q => q.Key == name);
        }
        public IndexItem? Find(Func<IndexItem, bool> where) {
            return _list.FirstOrDefault(where);
        }

        public void CopyTo(IndexItem[] array, int arrayIndex) {
            _list.CopyTo(array, arrayIndex);
        }

        public IEnumerator<IndexItem> GetEnumerator() {
            return _list.GetEnumerator();
        }

        public int IndexOf(IndexItem item) {
            return _list.IndexOf(item);
        }

        public void Insert(int index, IndexItem item) {
            _list.Insert(index, item);
        }

        public bool Remove(IndexItem item) {
            return _list.Remove(item);
        }

        public void RemoveAt(int index) {
            _list.RemoveAt(index);
        }

        IEnumerator IEnumerable.GetEnumerator() {
            return _list.GetEnumerator();
        }
    }
}
