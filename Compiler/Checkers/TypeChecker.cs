using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Checkers {
    public class TypeChecker {


        private readonly Dictionary<string, AstNode> lexicon;
        private readonly List<CompilationResult> links;
        private readonly ErrorSink errorSink;

        private void CheckTypeAliasNode(TypeAliasNode node) {
            //
        }
        private void CheckRecordNode(RecordNode node) {

            foreach (var field in node.Fields) {
                var root = field.TypeTokens.First();
                var id = root.Value;

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

        private void CheckOpenNode(OpenNode open) {
            if (!CompilationCache.Has(open.Id)) {
                errorSink.AddError(new Error(
                    $"Module '{open.Id}' does not seem to exist.",
                    open.IdToken
                ));
            }
        }


        public TypeChecker(ErrorSink es, Dictionary<string, AstNode> lexicon) {
            this.lexicon = lexicon;
            errorSink = es;
        }

        public void Check() {
            // check all the types
            foreach (var (key, node) in lexicon) {
                switch (node) {
                    case TypeAliasNode n: CheckTypeAliasNode(n); break;
                    case RecordNode n: CheckRecordNode(n); break;
                    case DataNode n: CheckDataNode(n); break;
                    case ChoiceNode n: CheckChoiceNode(n); break;
                    case OpenNode n: CheckOpenNode(n); break;
                    default: break;
                }
            };
        }



    }

   
}

