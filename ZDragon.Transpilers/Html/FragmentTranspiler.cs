using Compiler.Language.Nodes;
using System.Linq;
using ZDragon.Transpilers.PlantUML;

namespace ZDragon.Transpilers.Html {
    public class FragmentTranspiler {

      
        internal static string RenderViewNode(ViewNode node, string ns) {
            return $"<img style='max-width:100%;' src=\"/documents/{ns}/{node.HashString}.svg?{System.DateTime.Now.Ticks}\" alt=\"data\" />";

        }
        internal static string RenderIncludeNode(IncludeNode include) {

            var parts = include.QualifiedName.Split(".");
            var ns = $"{parts[0]}.{parts[1]}.{parts[2]}";

            return $"<img style='max-width:100%;' src=\"/documents/{ns}/{parts[3]}.svg?{System.DateTime.Now.Ticks}\" alt=\"data\" />";
        }

        internal static string RenderGuidelineNode(GuidelineNode node) {
            var title = node.GetAttribute("Title") ?? node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description", "");
            var rationale = node.GetAttribute("Rationale", "");
            var number = node.GetAttribute("Number", "000");

            return @$"<div class='guideline'>
<title>GUIDELINE {number}: {title}</title>
<dl>
    <dt>Description</dt>
    <dd>{description}</dd>
    <dt>Rationale</dt>
    <dd>{rationale}</dd>
</dl>
</div>";
        }

        internal static string RenderRequirementNode(RequirementNode node) {
            var title = node.GetAttribute("Title") ?? node.GetAttribute("Name") ?? node.Id;
            var description = node.GetAttribute("Description", "");
            var rationale = node.GetAttribute("Rationale", "");
            var number = node.GetAttribute("Number", "000");

            return @$"<div class='requirement'>
<title>REQUIREMENT {number}: {title}</title>
<dl>
    <dt>Description</dt>
    <dd>{description}</dd>
    <dt>Rationale</dt>
    <dd>{rationale}</dd>
</dl>
</div>";
        }

       


        internal static string RenderRecordTable(RecordNode node) {


            var body = node.Fields.Select(field => {
                var optional = field.Types.FirstOrDefault() == "Maybe";
                var links = field.Types.Select(t => {
                    if (!ClassDiagramTranspiler.baseTypes.Contains(t)) return $"<a href='#{t}-link'>{t}</a>";
                    else return t;
                });
                return $"<tr><td>{field.Id}</td><td>{string.Join(" ", links)}</td><td>{field.Description}</td><td>{!optional}</td></tr>";
            });

            return $@"
<div class='keep-together language-table'>
    <h2 id='{node.Id}-link'>{node.Id}</h2>
    <div class='language-table--description'><p>{node.Description}</p></div>
    <table>
        <thead><tr>
    <th>Name</th>
    <th>Types</th>
    <th>Description</th>
    <th>Required</th>
</tr></thead>
        <tbody>
            {string.Join("", body)}
        </tbody>
    </table>
</div>
";
        }

        internal static string RenderChoiceTable(ChoiceNode node) {

            var body = node.Fields.Select(field => {
                return $"<tr><td>{field.Value}</td><td>{field.Description}</td></tr>";
            });

            return $@"
<div class='keep-together language-table'>
    <h2 id='{node.Id}-link'>{node.Id}</h2>
    <div class='language-table--description'><p>{node.Description}</p></div>
    <table>
        <thead><tr>
    <th>Name</th>
    <th>Description</th>
</tr></thead>
        <tbody>
            {string.Join("", body)}
        </tbody>
    </table>
</div>
";
        }

        internal static string RenderDataTable(DataNode node) {

            var body = node.Fields.Select(field => {
                return $"<tr><td><a href='#{field.Id}-link'>{field.Id}</a></td><td>{field.Description}</td></tr>";
            });

            return $@"
<div class='keep-together language-table'>
    <h2 id='{node.Id}-link'>{node.Id}</h2>
    <div class='language-table--description'><p>{node.Description}</p></div>
    <table>
        <thead><tr>
    <th>Name</th>
    <th>Description</th>
</tr></thead>
        <tbody>
            {string.Join("", body)}
        </tbody>
    </table>
</div>
";
        }

        internal static string RenderAttributesTable(AttributesNode node) {

            var attributes = node.Attributes.Select(a => $"<tr><td>{a.Key}</td><td>{a.Value}</td></tr>");
            
            return $@"
<div class='keep-together language-table'>
    <h2>{node.Title}</h2>
    <div class='language-table--description'><p>{node.Description}</p></div>
    <table>
        <thead><tr>
    <th>Key</th>
    <th>Value</th>
</tr></thead>
        <tbody>
            {string.Join("", attributes)}
        </tbody>
    </table>
</div>
";
        }



    }
}
