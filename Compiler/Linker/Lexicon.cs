using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Linker {
    public class Lexicon {
        private readonly Dictionary<string, AstNode> lexicon;
        private readonly ErrorSink errorSink;
        private readonly IEnumerable<IIdentifierExpressionNode> ast;

        public Lexicon(ErrorSink es, IEnumerable<AstNode> ast) {
            this.errorSink = es;
            this.ast = ast.OfType<IIdentifierExpressionNode>();
            this.lexicon = new Dictionary<string, AstNode>();
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
            //
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

        public Dictionary<string, AstNode> CreateLexicon() {

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
                    default: break;
                }
            }

            return lexicon;
        }

    }
}
