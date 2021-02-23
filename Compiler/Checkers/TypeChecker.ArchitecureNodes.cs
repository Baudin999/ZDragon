using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Checkers {

    public partial class TypeChecker {

        private void CheckComponentNode(ComponentNode node) {

            var interactions = node.Attributes.FirstOrDefault(a => a.Key == "Interactions")?.ItemsTokens ?? new List<List<Token>>();
            
            foreach (var interaction in interactions) {
                var token = interaction.Where(i => i.Kind == SyntaxKind.IdentifierToken).FirstOrDefault();
                if (token != null) {
                    CheckToken(node, null, token);
                }
            }
        }


        private void CheckInteractionNode(InteractionNode node) {
            var from = node.GetAttributeNode("From");
            var to = node.GetAttributeNode("To");

            if (from is null) errorSink.AddError(new Error(
                ErrorType.Architecture_Interaction_MissingFrom,
                $"The interaction '{node.Id}' is missing a 'From' parameter.",
                node.IdToken
                ));
            else {
                CheckToken(node, null, from.ValueToken.Last());
            }
            if (to is null) errorSink.AddError(new Error(
                ErrorType.Architecture_Interaction_MissingTo,
                $"The interaction '{node.Id}' is missing a 'From' parameter.",
                node.IdToken
                ));
            else {
                CheckToken(node, null, to.ValueToken.Last());
            }
        }

        private void CheckEndpointNode(EndpointNode node) {

            if (node.TypeDefinition != null) {
                HashSet<string> usedParams = new HashSet<string>();
                bodyChecker(node, node.TypeDefinition, usedParams);
            }

            var interactions = node.Attributes.FirstOrDefault(a => a.Key == "Interactions")?.ItemsTokens ?? new List<List<Token>>();

            foreach (var interaction in interactions) {
                var token = interaction.Where(i => i.Kind == SyntaxKind.IdentifierToken).FirstOrDefault();
                if (token != null) {
                    CheckToken(node, null, token);
                }
            }
        }

        private void CheckSystemNode(SystemNode node) {

            var interactions = node.Attributes.FirstOrDefault(a => a.Key == "Interactions")?.ItemsTokens ?? new List<List<Token>>();
            foreach (var interaction in interactions) {
                var token = interaction.Where(i => i.Kind == SyntaxKind.IdentifierToken).FirstOrDefault();
                if (token != null) {
                    CheckToken(node, null, token);
                }
            }

            var contains = node.Attributes.FirstOrDefault(a => a.Key == "Contains")?.ItemsTokens ?? new List<List<Token>>();
            foreach (var c in contains) {
                var token = c.Where(i => i.Kind == SyntaxKind.IdentifierToken).FirstOrDefault();
                if (token != null) {
                    CheckToken(node, null, token);
                }
            }
        }



    }
}
