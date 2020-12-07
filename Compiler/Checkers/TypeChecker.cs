using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Checkers {
    public class TypeChecker {


        private readonly Dictionary<string, AstNode?> lexicon;
        private readonly ErrorSink errorSink;
        private readonly IEnumerable<AstNode> ast;

        private void CheckTypeAliasNode(TypeAliasNode node) {
            //
        }
        private void CheckRecordNode(RecordNode node) {
            foreach (var field in node.Fields) {
                var root = field.TypeTokens.First();
                var id = root.Value;
                CheckTokens(field.TypeTokens);

                if (id == "Maybe") {
                    CheckMaybe(node, field, field.TypeTokens);
                }
                else if (id == "List") {
                    CheckList(node, field, field.TypeTokens);
                }
            }
        }
        private void CheckDataNode(DataNode node) {
            // generate record if they do not exist.
            foreach (var field in node.Fields) {
                if (!lexicon.ContainsKey(field.Id)) {
                    var record = new RecordNode(
                                        field.AnnotationNode, 
                                        field.IdToken, 
                                        field.TypesTokens.Where(t => t.Kind == SyntaxKind.GenericParameterToken).ToList(), 
                                        new List<Token>(), 
                                        new List<RecordFieldNode>());
                    lexicon.Add(field.Id, record);
                }
            }
        }
        private void CheckChoiceNode(ChoiceNode node) {
            // choice needs at least 2 entries
            if (node.Fields.Count < 2) {
                errorSink.AddError(new Error(
                    $"A choice needs at least 2 entries.",
                    node.IdToken
                ));
            }

            // choice nodes can only contain the same type
            SyntaxKind? t = node.Fields.First().ValueToken.Kind;
            foreach (var field in node.Fields) {
                if (field.ValueToken.Kind != t) {
                    errorSink.AddError(new Error(
                        $"In a choice we expect all enties to be of the same type. We expected {t} but we received {field.ValueToken.Kind} ({field.Value}).",
                        field.ValueToken
                    ));
                }
            }
        }

        private void AddToLexicon<T>(T node) where T: AstNode, IIdentifierExpressionNode {
            if (lexicon.ContainsKey(node.Id)) {
                errorSink.AddError(new Error(
                    $"Entity with Id \"{node.Id}\" already exists.",
                    node.IdToken
                ));
            }
            else {
                lexicon.Add(node.Id, node);
            }
        }

        public TypeChecker(ErrorSink es, IEnumerable<AstNode> ast) {
            this.ast = ast;
            this.lexicon = InitializeLexicon();
            errorSink = es;

        }

        public Dictionary<string, AstNode?> Check() {
            // mapping the nodes into the lexicon
            foreach (var node in ast) {
                // can reduce to single type switch, but
                // this will change in the future and do 
                // not want to limit myself.
                switch (node) {
                    case TypeAliasNode n: AddToLexicon(n); break;
                    case RecordNode n: AddToLexicon(n); break;
                    case DataNode n: AddToLexicon(n); break;
                    case ChoiceNode n: AddToLexicon(n); break;
                    default: break;
                }
            }

            // check all the types
            foreach (var node in ast) {
                switch (node) {
                    case TypeAliasNode n: CheckTypeAliasNode(n); break;
                    case RecordNode n: CheckRecordNode(n); break;
                    case DataNode n: CheckDataNode(n); break;
                    case ChoiceNode n: CheckChoiceNode(n); break;
                    default: break;
                }
            };

            return lexicon;
        }


        private Dictionary<string, AstNode?> InitializeLexicon() {
            var lexicon = new Dictionary<string, AstNode?>() {
                { "String", null },
                { "Number", null },
                { "Date", null },
                { "Time", null },
                { "DateTime", null },
                { "Decimal", null },
                { "Boolean", null },

                // higher level types
                { "Maybe", null },
                { "Either", null },
                { "List", null },
            };
            return lexicon;
        }

        private void CheckTokens(List<Token> tokens) {
            foreach (var token in tokens) {
                var id = token.Value;
                if (!lexicon.ContainsKey(id)) {
                    errorSink.AddError(new Error(
                        $"Type \"{id}\" does not exist.",
                        token
                    ));
                }
            }
        }

        private void CheckMaybe(IIdentifierExpressionNode root, IIdentifierExpressionNode? context, List<Token> tokens) {
            // Maybe can only have one type following the Maybe
            if (tokens.Count != 2) {
                var message = tokens.Count > 2 ? "too many" : "not enough";
                errorSink.AddError(new Error(
                    @$"A Maybe type can only have a single type parameter:
record {root.Id} =
    {context?.Id ?? "LastName"}: Maybe <<Type>>

Your Maybe definitions seems to have {message} type parameters.
",
                    root.IdToken
                ));
            }
        }

        private void CheckList(IIdentifierExpressionNode root, IIdentifierExpressionNode? context, List<Token> tokens) {
            // Maybe can only have one type following the Maybe
            if (tokens.Count != 2) {
                var message = tokens.Count > 2 ? "too many" : "not enough";
                errorSink.AddError(new Error(
                    @$"A List type can only have a single type parameter:
record {root.Id} =
    {context?.Id ?? "LastName"}: List <<Type>>

Your List definitions seems to have {message} type parameters.
",
                    root.IdToken
                ));
            }
        }

    }

   
}

