using Compiler;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ZDragon.Transpilers.Html {
    public class IndexTranspiler {
        private CompilationCache Cache { get; }

        public IndexTranspiler(CompilationCache cache) {
            this.Cache = cache;
        }

        public string Transpile() {

            var links = new List<Link>();
            foreach (var app in this.Cache.Values) {
                links.Add(new Link {
                    Title = app.Namespace,
                    Href = $"/{app.Namespace}/index.html"
                });
            }

            string page = $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <title>ZDragon</title>
    <base href='/'>

    <link rel='stylesheet' type='text/css' href='https://cdn.rawgit.com/dreampulse/computer-modern-web-font/master/fonts.css' />
    <link rel='stylesheet' type='text/css' href='/page-styles.css' media='all' />
    <link rel='stylesheet' type='text/css' href='/prism.css' />
</head>
<body>
<div class='content'>
    <div class='left'>
        <ul>
            {string.Join("\n", links.Select(l => $"<li><a href='{l.Href}'>{l.Title}</a></li>"))}
        </ul>
    </div>
    <div class='right'>
            Content
    </div>
</div>
</body>
</html>
";

            return page;
        }

    }

    public class Link {
        public string Title { get; set; } = default!;
        public string Href { get; set; } = default!;
    }
}
