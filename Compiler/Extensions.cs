using System.Collections.Generic;

namespace Compiler {
    public static class Extensions {
        public static IEnumerable<T> TakeAllButLast<T>(this IEnumerable<T> source) {
            var it = source.GetEnumerator();
            bool hasRemainingItems = false;
            bool isFirst = true;
            T item = default(T);

            do {
                hasRemainingItems = it.MoveNext();
                if (hasRemainingItems) {
                    if (!isFirst && item is not null) {
                        yield return item;
                    }
                    item = it.Current;
                    isFirst = false;
                }
            } while (hasRemainingItems);
        }
    }
}
