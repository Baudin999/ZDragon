using System;

namespace ZDragon.Project.Templates {
    public static class DatabaseTemplates {


        public static Func<string, string> Default = (name) => {
            return $@"

% database: PostgeSQL

# {name}

This is a database template.



";
        };
    }
}
