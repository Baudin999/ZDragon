using System;
using System.Globalization;

namespace ZDragon.Project.Templates {
    public static class ComponentTemplates {


        public static Func<string, string> Default = (name) => {
            var textInfo = new CultureInfo("en-US", false).TextInfo;
            var componentName = textInfo.ToTitleCase(name).Replace(" ", "");
            return $@"

# {name}

This is a component template.

component {componentName} =
    Name: {name}
    Description: The component description, this
        can be multiline with indentation based 
        syntax rules!

";
        };
    }
}
