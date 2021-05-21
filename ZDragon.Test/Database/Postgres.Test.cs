using System.Collections.Generic;
using System.Linq;
using Xunit;
using ZDragon.Project.Postgres;

namespace Database {
    public class Postgres {

        [Fact(Skip="Not used", DisplayName = "Database - Open Connection")]
        public async void Database_OpenConnection() {
            var result = await new PostgresFileSystem().Test();
            Assert.True(result.Count() > 0);
        }

        [Fact(Skip = "Not used", DisplayName = "Database - Create Table")]
        public async void Database_CreateTable() {
            var tableName = "Test001";
            var system = new PostgresFileSystem();

            await system.CreateTable("Test001", new Dictionary<string, string> {
                { "Foo", "text" }
            });

            Assert.True(await system.TableExists(tableName));

            await system.DropTable(tableName);

            Assert.False(await system.TableExists(tableName));
        }
    }
}
