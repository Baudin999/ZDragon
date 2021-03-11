using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Language {
    public class Lexicon {
        private readonly List<string> baseTypes = new List<string> { "String", "Number", "Boolean", "Date", "DateTime", "Time", "Money", "Guid", "Maybe", "List" };
        private readonly Dictionary<string, IIdentifierExpressionNode> lexicon;
        private readonly ErrorSink errorSink;
        private readonly IEnumerable<IIdentifierExpressionNode> ast;
        private readonly CompilationCache cache;
        private readonly List<OpenNode> refereces;
        private readonly string Namespace;

        public Lexicon(IEnumerable<AstNode> ast, CompilationCache cache, string ns) {
            this.errorSink = cache.ErrorSink;
            this.ast = ast.OfType<IIdentifierExpressionNode>();
            this.cache = cache;
            this.refereces = ast.OfType<OpenNode>().ToList();
            this.lexicon = new Dictionary<string, IIdentifierExpressionNode>();
            this.Namespace = ns;
        }

        private void AddRecordToLexicon(RecordNode record) {
            foreach (var extension in record.Extensions) {
                CheckTypeToken(extension, record, "extenstion");
            }


            foreach (var field in record.Fields) {
                foreach (var type in field.TypeTokens) {
                    CheckTypeToken(type, record, "field");
                }
            }
        }

        private void AddDataNodeToLexicon(DataNode node) {

            // generate record if they do not exist.
            foreach (var field in node.Fields) {
                if (!lexicon.ContainsKey(field.Id)) {
                    var record = new RecordNode(
                                        field.AnnotationNode,
                                        field.IdToken,
                                        field.TypesTokens.Where(t => t.Kind == SyntaxKind.GenericParameterToken).ToList(),
                                        new List<Token>(),
                                        new List<RecordFieldNode>());
                    addToLexicon(field.Id, record);
                }
            }
        }

        private void AddChoiceNodeToLexicon(ChoiceNode node) {
            //
        }

        private void AddTypeAliasNodeToLexicon(TypeAliasNode node) {
            if (node.Body is TypeApplicationNode) {
                // A type application in when we resolve a generic type
                // we ignore (because they are build in types) Maybe and List...
                // later we might revise that...

                var ta = (TypeApplicationNode)node.Body;

                // check if all the parameters exist.
                foreach (var token in ta.Parameters) {
                    if (token.Value == "Maybe" || token.Value == "List") continue;
                    else if (!lexicon.ContainsKey(token.Value)) {
                        errorSink.AddError(new Error(ErrorType.Unknown, $"Could not find type \"{token.Value}\" on type \"{node.Id}\"", token));
                    }
                }

                var taRoot = ta.Parameters.First();
                if (taRoot.Value == "Maybe" || taRoot.Value == "List") return;
                else if (lexicon.ContainsKey(taRoot.Value)) {
                    var rootNode = lexicon[taRoot.Value];
                    if (rootNode is RecordNode recordNode) {

                        // check number of generic parameters, we only allow
                        // complete application, not partial application...
                        if (recordNode.GenericParameters.Count != ta.Parameters.Count - 1) {
                            errorSink.AddError(new Error(ErrorType.Generics_ApplicationMisMatch, $"Invalid number of applied generic parameters.", node.IdToken));
                            return;
                        }

                        Dictionary<string, Token> genericParameters = new Dictionary<string, Token>();
                        for (int i = 0; i < recordNode.GenericParameters.Count; ++i) {
                            genericParameters.Add(recordNode.GenericParameters[i].Value, ta.Parameters[i + 1]);
                        }

                        var resolvedFields = recordNode.Fields.Select(f => {
                            return new RecordFieldNode(
                                f.AnnotationNode?.Clone(),
                                f.IdToken.Clone(),
                                f.TypeTokens.Select(t => {
                                    if (genericParameters.ContainsKey(t.Value)) return genericParameters[t.Value];
                                    else return t.Clone();
                                }),
                                f.Restrictions.Select(r => r.Clone()),
                                true
                                );
                        }).ToList();
                        var extensions = recordNode.Extensions.Select(e => e.Clone()).ToList();
                        extensions.Add(taRoot);

                        var newRecordNode = new RecordNode(
                            recordNode.AnnotationNode.Clone(),
                            node.IdToken.Clone(),
                            new List<Token>(),
                            extensions,
                            resolvedFields
                            );

                        lexicon[node.Id] = newRecordNode;
                    }
                }
            }
        }

        private void AddViewNodeToLexicon(ViewNode n) {
            foreach (var node in n.Nodes) {
                var link = Get(node.Value);
                if (link != null && !lexicon.ContainsKey(link.Id)) {
                    lexicon.Add(link.Id, link);
                }
            }
        }

        private void AddAttributesNode(AttributesNode node) {
            var interactions = node.GetAttributeItems("Interactions", new List<string>());
            foreach (var interaction in interactions) {

                // a contains attribute consists of parts which are split with a ';' we only want 
                // the first part because that is the type we want.
                var cName = interaction.Split(";").First();

                var link = Get(cName);
                if (link != null && link is IIdentifierExpressionNode) {
                    if (!lexicon.ContainsKey(interaction)) {
                        lexicon.Add(interaction, link);
                    }
                }
            }

            var contains = node.GetAttributeItems("Contains", new List<string>());
            foreach (var c in contains) {

                // a contains attribute consists of parts which are split with a ';' we only want 
                // the first part because that is the type we want.
                var cName = c.Split(";").First();

                var link = Get(cName);
                if (link != null && link is IIdentifierExpressionNode) {
                    if (!lexicon.ContainsKey(cName)) {
                        lexicon.Add(c, link);
                    }
                }
            }


            // Import the extended fields from the other component
            // and add these extensions to this components.
            if (node is ComponentNode cn) {
                foreach (var ext in cn.Extensions) {

                    var id = ext switch {
                        QualifiedToken qt => Get(qt),
                        _ => Get(ext.Value)
                    };

                    if (id is AttributesNode an) {
                        foreach (var a in an.Attributes) {
                            if (!node.HasAttribute(a.Key)) {
                                node.Attributes.Add(a);
                            }
                        }

                    }
                    else {
                        //throw new System.Exception("Not an attribute node");
                    }
                }
            }
        }

        private void CheckTypeToken(Token token, IIdentifierExpressionNode root, string errorQualifier) {
            //
        }

        private void addToLexicon<T>(T node) where T : AstNode, IIdentifierExpressionNode {
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
        private void addToLexicon<T>(string key, T node) where T : AstNode, IIdentifierExpressionNode {
            if (lexicon.ContainsKey(key)) {
                errorSink.AddError(new Error(
                    $"Entity with Id \"{node.Id}\" already exists.",
                    node.IdToken
                ));
            }
            else {
                lexicon.Add(key, node);
            }
        }

        private IIdentifierExpressionNode? Get(string typeName) {
            if (lexicon.ContainsKey(typeName)) return lexicon[typeName];
            IIdentifierExpressionNode? node = null;
            foreach (var openNode in refereces) {
                var _cr = cache.Has(openNode.Namespace) ? cache.Get(openNode.Namespace) : null;
                if (_cr != null && _cr.Lexicon.ContainsKey(typeName)) {
                    node = (IIdentifierExpressionNode)_cr.Lexicon[typeName].Copy();
                    if (_cr.Namespace != this.Namespace) {
                        node.Imported = true;
                        node.ImportedFrom = openNode.Namespace;
                    }
                    break;
                }
            }
            return node;
        }

        private IIdentifierExpressionNode? Get(QualifiedToken token) {
            IIdentifierExpressionNode? node = null;
            var _cr = cache.Has(token.Namespace) ? cache.Get(token.Namespace) : null;
            if (_cr != null && _cr.Lexicon.ContainsKey(token.Id)) {
                node = (IIdentifierExpressionNode)_cr.Lexicon[token.Id].Copy();
                if (_cr.Namespace != token.Namespace) {
                    node.Imported = true;
                    node.ImportedFrom = token.Namespace;
                }
            }
            return node;
        }

        public Dictionary<string, IIdentifierExpressionNode> CreateLexicon() {

            // becuase we do not want the order in which the nodes are written 
            // to cause problems in the lexicon lookup we will first add all of the types
            // to the lexicon and than run through the type checker
            // mapping the nodes into the lexicon
            foreach (var node in ast) {
                // can reduce to single type switch, but
                // this will change in the future and do 
                // not want to limit myself.
                switch (node) {
                    case TypeAliasNode n: addToLexicon(n); break;
                    case RecordNode n: addToLexicon(n); break;
                    case DataNode n: addToLexicon(n); break;
                    case ChoiceNode n: addToLexicon(n); break;

                    // documentation
                    case ViewNode n: addToLexicon(n); break;
                    case GuidelineNode n: addToLexicon(n); break;
                    case RequirementNode n: addToLexicon(n); break;

                    // planning
                    case RoadmapNode n: addToLexicon(n); break;
                    case MilestoneNode n: addToLexicon(n); break;
                    case TaskNode n: addToLexicon(n); break;

                    // architecture
                    case ComponentNode n: addToLexicon(n); break;
                    case EndpointNode n: addToLexicon(n); break;
                    case SystemNode n: addToLexicon(n); break;
                    case PersonNode n: addToLexicon(n); break;
                    case InteractionNode n: addToLexicon(n); break;
                    default: break;
                }
            }


            // mapping the nodes into the lexicon
            foreach (var node in ast) {
                // can reduce to single type switch, but
                // this will change in the future and do 
                // not want to limit myself.
                switch (node) {
                    case TypeAliasNode n: AddTypeAliasNodeToLexicon(n); break;
                    case RecordNode n: AddRecordToLexicon(n); break;
                    case DataNode n: AddDataNodeToLexicon(n); break;
                    case ChoiceNode n: AddChoiceNodeToLexicon(n); break;

                    // documentation
                    case ViewNode n: AddViewNodeToLexicon(n); break;

                    // architecture
                    case AttributesNode n: AddAttributesNode(n); break;
                    default: break;
                }
            }

            return lexicon;
        }

    }
}
