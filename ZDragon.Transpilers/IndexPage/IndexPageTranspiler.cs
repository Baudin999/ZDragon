using Compiler;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ZDragon.Transpilers.IndexPage {
    public class IndexPageTranspiler {

        readonly List<string> parts = new List<string>();

        public CompilationCache Cache { get; }

        public IndexPageTranspiler(CompilationCache cache) {
            this.Cache = cache;
        }


        public void Transpile() {
            parts.Add($@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <title>ZDragon</title>
    <base href='/'>
    <link rel='stylesheet' type='text/css' href='/page-styles.css' media='all' />
    <link rel='stylesheet' type='text/css' href='/prism.css' />
</head>
<body>
");

            parts.Add("<ul>");
            foreach (var result in Cache.Values) {
                parts.Add($"<li><a href='/documents/{result.Namespace}/index.html?timestamp={DateTime.Now.Ticks}' /></li>");
            }
            parts.Add("</ul>");

            parts.Add(@"
</body>
</html>
");

        }

    }
}
