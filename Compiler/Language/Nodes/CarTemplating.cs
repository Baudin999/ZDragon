using System.Collections.Generic;
using System.Text.RegularExpressions;


namespace Compiler.Language.Nodes {
    public static class CarTemplating {
        //Regex to match keywords of the format {variable}
        public static readonly Regex TextTemplateRegEx = new Regex(@"{([a-zA-Z0-9]+)\.([a-zA-Z0-9]+)}", RegexOptions.Compiled);

        /// <summary>
        /// Replaces all the items in the template string with format "{variable}" using the value from the data
        /// </summary>
        /// <param name="templateString">string template</param>
        /// <param name="model">The data to fill into the template</param>
        /// <returns></returns>
        public static string FormatTemplate(this string templateString, Dictionary<string, IIdentifierExpressionNode> lexicon) {
            if (lexicon.Count == 0) {
                return templateString;
            }


            return TextTemplateRegEx.Replace(
                templateString,
                match => {

                    if (match.Groups.Count != 3) return match.Value;

                    var root = match.Groups[1].Value;
                    var field = match.Groups[2].Value;

                    if (lexicon.ContainsKey(root) && lexicon[root] is AttributesNode an) {
                        return an.GetAttribute(field, "<not found>");
                    }
                    else {
                        return match.Value;
                    }
                });
        }
    }

}
