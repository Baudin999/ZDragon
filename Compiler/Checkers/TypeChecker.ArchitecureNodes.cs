using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Checkers {

    public partial class TypeChecker {

        private void CheckAttributesNode(AttributesNode node) {
            if (!node.Imported) {
                var interactions = node.Attributes.FirstOrDefault(a => a.Key == "Interactions")?.ItemsTokens ?? new List<List<Token>>();
                foreach (var interaction in interactions) {
                    var token = interaction.Where(i => i.Kind == SyntaxKind.IdentifierToken).FirstOrDefault();
                    if (token != null) {
                        errorSink.Errors.AddRange(CheckToken(node, null, token));
                    }
                }

                var contains = node.Attributes.FirstOrDefault(a => a.Key == "Contains")?.ItemsTokens ?? new List<List<Token>>();
                foreach (var c in contains) {
                    var token = c.Where(i => i.Kind == SyntaxKind.IdentifierToken).FirstOrDefault();
                    if (token != null) {
                        errorSink.Errors.AddRange(CheckToken(node, null, token));
                    }
                }
            }

            node.Extensions.ForEach(extension => {
                if (extension is QualifiedToken qt) errorSink.Errors.AddRange(CheckQualifiedToken(node, null, qt));
                else errorSink.Errors.AddRange(CheckToken(node, null, extension));
            });
        }

        private void CheckComponentNode(ComponentNode node) {
            CheckAttributesNode(node);
        }


        private void CheckInteractionNode(InteractionNode node) {
            var from = node.GetAttributeNode("From");
            var to = node.GetAttributeNode("To");

            if (from is null) errorSink.AddError(new Error(
                ErrorKind.Architecture_Interaction_MissingFrom,
                $"The interaction '{node.Id}' is missing a 'From' parameter.",
                node.IdToken
                ));
            else {
                var token = from.ValueToken.FirstOrDefault(v => v.Kind == SyntaxKind.IdentifierToken);
                if (token != null)
                    errorSink.Errors.AddRange(CheckToken(node, null, token));
            }
            if (to is null) errorSink.AddError(new Error(
                ErrorKind.Architecture_Interaction_MissingTo,
                $"The interaction '{node.Id}' is missing a 'From' parameter.",
                node.IdToken
                ));
            else {
                var token = to.ValueToken.FirstOrDefault(v => v.Kind == SyntaxKind.IdentifierToken);
                if (token != null)
                    errorSink.Errors.AddRange(CheckToken(node, null, token));
            }
        }

        private void CheckEndpointNode(EndpointNode node) {

            if (node.TypeDefinition != null) {
                HashSet<string> usedParams = new HashSet<string>();
                bodyChecker(node, node.TypeDefinition, usedParams);
            }
            else {
                errorSink.AddWarning(new Warning(WarningType.Default, $"Endpoint '{node.Id}' does not have a type definition.", node.IdToken));
            }

            if (node.GetAttribute("Url") is null) {
                errorSink.AddWarning(new Warning(WarningType.Default, $"Endpoint '{node.Id}' does not have a 'Url' attribute.", node.IdToken));
            }
            if (node.GetAttribute("Description") is null) {
                errorSink.AddWarning(new Warning(WarningType.Default, $"Endpoint '{node.Id}' does not have a 'Description' attribute.", node.IdToken));
            }

            CheckAttributesNode(node);
        }

        private void CheckSystemNode(SystemNode node) {
            CheckAttributesNode(node);
        }



    }
}
