using Compiler.Language.Nodes;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace CLI {
    class Program {
        static void Main(string[] args) {
            var code = @"
component Application001
";
            
            var compiler = new Compiler.Compiler(code);
            var compilerResult = compiler.Compile().Check();

            var settings = new JsonSerializerSettings {
                TypeNameHandling = TypeNameHandling.Auto
            };
            var ast = JsonConvert.SerializeObject(compilerResult.Ast, settings);

            var nodes = JsonConvert.DeserializeObject<List<AstNode>>(ast, settings);


        }
    }
}
