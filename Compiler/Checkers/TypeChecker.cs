using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Checkers {
    public partial class TypeChecker {
        private readonly List<string> baseTypes = new List<string> { "String", "Number", "Boolean", "Date", "DateTime", "Time", "Money", "Guid", "Maybe", "List" };
        private readonly CompilationCache cache;
        private readonly CompilationResult compilationResult;
        //private readonly Index? index = null;
        private readonly Dictionary<string, IIdentifierExpressionNode> lexicon;
        private readonly Dictionary<string, IIdentifierExpressionNode> externalLexicon = new Dictionary<string, IIdentifierExpressionNode>();
        private ErrorSink errorSink => cache.ErrorSink;


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
                    Add(field.Id, record);
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

        private void CheckOpenNode(OpenNode open) {
            if (!cache.Has(open.Id)) {
                errorSink.AddError(new Error(
                    $"Module '{open.Id}' does not seem to exist.",
                    open.IdToken
                ));
            }
        }

        private void CheckViewNode(ViewNode view) {
            CheckToken(view, null, view.IdToken);
            foreach (var node in view.Nodes) {
                CheckToken(view, null, node);
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

        private void CheckTokens(IIdentifierExpressionNode root, IIdentifierExpressionNode? context, List<Token> tokens) {
            foreach (var token in tokens) {
                if (token is QualifiedToken qt) CheckQualifiedToken(root, context, qt);
                else if (token is Token t) CheckToken(root, context, t);
            }
        }

        private void CheckToken(IIdentifierExpressionNode root, IIdentifierExpressionNode? context, Token token) {
            CheckToken(root, context, token, token.Value);
        }

        private void CheckToken(IIdentifierExpressionNode root, IIdentifierExpressionNode? context, Token token, string typeName) {
            var rootName = context?.Id ?? root.Id;
            if (baseTypes.Contains(typeName)) return;
            else if (lexicon.ContainsKey(typeName)) return;
            else if (token.Kind == SyntaxKind.GenericParameterToken) {
                if (root is RecordNode rn) {
                    if (!rn.GenericParameters.Any(e => e.Value == typeName)) {
                        errorSink.AddError(new Error(
                            ErrorType.GenericParameter_Undefined,
                            $"Undeclared generic parameter \"{typeName}\" on field '{context?.Id}' of record '{root.Id}'.",
                            token
                            ));
                        return;
                    }
                }
                else if (root is TypeAliasNode tan) {
                    if (!tan.GenericParameters.Any(e => e.Value == typeName)) {
                        errorSink.AddError(new Error(
                            ErrorType.GenericParameter_Undefined,
                            @$"Undeclared generic parameter {typeName} on type alias '{root.Id}'. 

We expect a generic type definition to at least contain {typeName} as a generic parameter:

type {root.Id} {typeName} = ...;
",
                            token
                            ));
                        return;
                    }
                }
                return;
            }
            else {
                // check all the other "open" declarations to the get the ast node
                var _ref = Get(token.Value);
                if (_ref != null) {
                    Add(token.Value, _ref);
                    return;
                }
            }

            // default not found Error Sync
            errorSink.AddError(new Error(
                ErrorType.Unknown,
                @$"Could not find type '{token.Value}' on '{rootName}'.",
                token
            ));
        }

        private void CheckQualifiedToken(IIdentifierExpressionNode root, IIdentifierExpressionNode? context, QualifiedToken qt) {

            if (!cache.Has(qt.Namespace)) {
                errorSink.AddError(new Error(
                    $"Module '{qt.Namespace}' does not exist",
                    Token.Range(qt.NamespaceParts.First(), qt.NamespaceParts.Last())
                ));
                return;
            }
            else {
                var module = cache.Get(qt.Namespace).Lexicon;
                if (!baseTypes.Contains(qt.Id) && !module.ContainsKey(qt.Id)) {
                    errorSink.AddError(new Error(
                        @$"Could not find type '{qt.QualifiedName}' in module '{qt.Namespace}'.",
                        qt.IdToken
                    ));
                }
                else {
                    Add(qt.QualifiedName, module[qt.Id]);
                }
            }
        }

        private IIdentifierExpressionNode? Get(string typeName) {
            IIdentifierExpressionNode? node = null;

            // run through the compilation results
            foreach (var openNode in compilationResult.References) {
                var _cr = cache.Has(openNode.Namespace) ? cache.Get(openNode.Namespace) : null;
                if (_cr != null && _cr.Lexicon.ContainsKey(typeName)) {
                    node = (IIdentifierExpressionNode)_cr.Lexicon[typeName].Copy();
                    if (_cr.Namespace != compilationResult.Namespace) {
                        node.Imported = true;
                        node.ImportedFrom = _cr.Namespace;
                    }
                    else {
                        //
                    }
                    break;
                }
            }
            return node;
        }


        private void Add(string key, IIdentifierExpressionNode node) {
            if (!this.externalLexicon.ContainsKey(key)) {
                this.externalLexicon.Add(key, node);
            }
        }

        public TypeChecker(CompilationCache? cache, CompilationResult cr) {
            this.cache = cache ?? new CompilationCache(new ErrorSink());
            this.lexicon = cr.Lexicon;
            this.compilationResult = cr;
        }
        

        public void Check() {
            // check all the types
            foreach (var (key, node) in lexicon) {
                CheckNode(node);
            };

            while (externalLexicon.Count > 0) {
                var temp = new Dictionary<string, IIdentifierExpressionNode>();
                foreach (var (key, value) in externalLexicon) {
                    temp.Add(key, value);
                }
                externalLexicon.Clear();

                foreach (var (key, value) in temp) {
                    if (!lexicon.ContainsKey(key)) {
                        lexicon.Add(key, value);
                    }
                }
            }
        }

        private void CheckNode(IIdentifierExpressionNode node) {
            switch (node) {
                case TypeAliasNode n: CheckTypeAliasNode(n); break;
                case RecordNode n: CheckRecordNode(n); break;
                case DataNode n: CheckDataNode(n); break;
                case ChoiceNode n: CheckChoiceNode(n); break;
                case OpenNode n: CheckOpenNode(n); break;

                // documentation nodes
                case ViewNode n: CheckViewNode(n); break;

                // check architectural nodes
                case ComponentNode n: CheckComponentNode(n); break;
                case EndpointNode n: CheckEndpointNode(n); break;
                case SystemNode n: CheckSystemNode(n); break;
                case InteractionNode n: CheckInteractionNode(n); break;
                default: break;
            }
        }
    }
}

