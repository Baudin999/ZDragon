using Compiler.Language.Nodes;
using System;
using System.Collections.Generic;

namespace ZDragon.Transpilers.Planning {
    public class PlanningTranspiler {

        private readonly List<IPlanningNode> lexicon;
        private readonly List<string> parts = new List<string>();

        public PlanningTranspiler(List<IPlanningNode> lexicon) {
            this.lexicon = lexicon;
        }

        private void TranspileTask(TaskNode node) {
            var durations = new List<string> {
                "day",
                "days",
                "week",
                "weeks",
                "month",
                "months",
                "year",
                "years"
            };

            var title = node.GetAttribute("Title") ?? node.GetAttribute("Name") ?? node.Id;

            // Setting the duration
            var duration = node.GetAttribute("Duration", "1 day").ToLower().Trim();
            var durationParts = duration.Split(" ");
            if (durationParts.Length == 0) {
                duration = "1 day";
            }
            else if (durationParts.Length == 1) {
                duration = durationParts[0] + " days";
            }
            else if (durationParts.Length == 2) {
                if (!durations.Contains(durationParts[1])) {
                    duration = durationParts[0] + " days";
                }
            }


            // start and end dates - finding
            var start = parseDate(node.GetAttribute("Start"));
            var startString = "";
            if (start != null) startString = $" starts on {start} ";

            var end = parseDate(node.GetAttribute("End"));
            var endString = "";
            if (end != null) endString = $" and ends on {end} ";


            var after = node.GetAttribute("After") ?? node.GetAttribute("DependsUpon");
            var afterString = "";
            if (after != null) {
                afterString = $" and starts after [{after}]'s end";
            }


            if (start != null && end != null) {
                parts.Add($"[{title}] as [{node.Id}] {startString} {endString}");
            }
            else if (start != null && end is null && duration != null) {
                parts.Add($"[{title}] as [{node.Id}] {startString} and lasts {duration}");
            }
            else {
                parts.Add($"[{title}] as [{node.Id}] lasts {duration}{afterString}");
            }
        }

        private string? parseDate(string? input) {
            if (input is null) return null;

            DateTime date;
            if (DateTime.TryParse(input, out date)) {
                return date.ToString("yyyy-MM-dd");
            }
            else {
                return "";
            }
        }

        private void TranspileRoadmap(RoadmapNode node) {
            var title = node.GetAttribute("Title");
            var projectStart = node.GetAttribute("Start");
            var projectEnd = node.GetAttribute("End");

            if (projectEnd != null) parts.Insert(0, $"[End] happens {parseDate(projectEnd)}");
            if (projectStart != null) parts.Insert(0, $"Project starts {parseDate(projectStart)}");
            if (title != null) parts.Insert(0, $"title {title}");
        }


        private void ParseNode(IPlanningNode node) {
            switch (node) {
                case TaskNode n: TranspileTask(n); break;
                case RoadmapNode n: TranspileRoadmap(n); break;

                default: break;
            }
        }

        public string Transpile() {
            parts.Add(@"
<style>
ganttDiagram {
	task {
		FontName ""Computer Modern Sans""
		BackGroundColor #C2C5CC
        FontColor #1b232e
		LineColor #1b232e
        RoundCorner 1
	}
}
</style>
");
            parts.Add("hide footbox");
            parts.Add("printscale weekly");


            foreach (var node in lexicon) {
                ParseNode(node);
            }
            parts.Add("@endgantt");
            parts.Insert(0, "@startgantt");
            return string.Join("\n", parts);
        }

    }
}
