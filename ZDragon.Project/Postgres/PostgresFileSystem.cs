using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ZDragon.Project.Postgres {
    public class PostgresFileSystem {

        private string ConnString {
            get {
                string server = "localhost";
                string port = "5432";
                string userName = "postgres";
                string password = "admin";
                string database = "ZDragon";

                string connstring = String.Format("Server={0};Port={1};" +
                        "User Id={2};Password={3};Database={4};",
                        server, port, userName, password, database);
                return connstring;
            }
        }

        public async Task<bool> TestConnection(NpgsqlConnection conn) {
            try {
                await conn.OpenAsync();
                return true;
            }
            catch(Exception ex) {
                Console.WriteLine(ex);
                return false;
            }
        }

        public async Task<List<FileResult>> Test() {
            var result = new List<FileResult>();

            // Making connection with Npgsql provider
            using (NpgsqlConnection conn = new NpgsqlConnection(this.ConnString)) {
                conn.Open();
                // quite complex sql statement
                string sql = "SELECT * FROM public.\"Files\"";
                var command = new NpgsqlCommand(sql, conn);
                var dataReader = await command.ExecuteReaderAsync();

                while (dataReader.Read())
                    result.Add(new FileResult(dataReader[0]?.ToString() ?? ""));

                conn.Close();
            }

            return result;
        }

        public async Task<bool> TableExists(string tableName) {
            string sql = @$"
SELECT EXISTS (
   SELECT 1
   FROM   information_schema.tables 
   WHERE  table_schema = 'public' AND 
      table_name = '{tableName.ToLower()}'
   );
";
            bool result = false;
            using (NpgsqlConnection conn = new NpgsqlConnection(this.ConnString)) {
                conn.Open();
                 var command = new NpgsqlCommand(sql, conn);
                var dataReader = await command.ExecuteReaderAsync();
                dataReader.Read();

                result = bool.Parse(dataReader[0]?.ToString() ?? "false");
                conn.Close();
            }
            return result;
        }


        public async Task CreateTable(string tableName, Dictionary<string, string> columns) {
            using (NpgsqlConnection conn = new NpgsqlConnection(this.ConnString)) {
                conn.Open();
                var clmns = string.Join(Environment.NewLine, columns.Select(kvp => $"{kvp.Key} {kvp.Value}"));
                // quite complex sql statement
                string sql = @$"CREATE TABLE {tableName.ToLower()} (
Id  SERIAL PRIMARY KEY,
{clmns}
);";
                var command = new NpgsqlCommand(sql, conn);
                var dataReader = await command.ExecuteNonQueryAsync();

                conn.Close();
            }
        }

        public async Task DropTable(string tableName) {
            using (NpgsqlConnection conn = new NpgsqlConnection(this.ConnString)) {
                conn.Open();
                // quite complex sql statement
                string sql = @$"DROP TABLE {tableName.ToLower()};";
                var command = new NpgsqlCommand(sql, conn);
                var dataReader = await command.ExecuteNonQueryAsync();
                conn.Close();
            }
        }


        public async Task Init(NpgsqlConnection conn) {
            // test if we can make a connection
            if (await TestConnection(conn)) {

                // create the "Files" table
                var columns = new Dictionary<string, string> {
                    { "App", "varchar(50)" },
                    { "Namespace", "varchar(250)" },
                    { "Content", "text" },
                    { "Version", "integer DEFAULT 0" }
                };

            }
        }
    }

    public class FileResult {
        public string Content { get; }

        public FileResult(string content) {
            this.Content = content;
        }

    }
}
