using Compiler;
using LiteDB;

namespace ZDragon.Project.LiteDb {
    public class LiteDbInterop {

        public void Store(CompilationResult result) {
            //
            using (var db = new LiteDatabase(@"store.db")) {
                //

                var col = db.GetCollection<CompilationResult>("compilationResult");
                col.Upsert(result);

            }

        }

        public CompilationResult? Retrieve() {
            using (var db = new LiteDatabase(@"store.db")) {
                //

                var col = db.GetCollection<CompilationResult>("compilationResult");
                return col.Query().FirstOrDefault();

            }
        }
    }
}
