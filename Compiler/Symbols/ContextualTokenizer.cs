using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices.ComTypes;
using System.Text;
using System.Threading.Tasks;

namespace Compiler.Symbols {
    internal partial class ContextualTokenizer {
        public List<Token> Tokens { get; }
        public ErrorSink ErrorSink { get; }

#pragma warning disable IDE0044 // Add readonly modifier
        private int indentLevel = 0;
        private ContextType CurrentContext = ContextType.None;
#pragma warning restore IDE0044 // Add readonly modifier

        private int index = 0;
        private readonly int max;
        private Token Current => Tokens[index];
        private Token? Next => (index + 1) < max ? Tokens[index + 1] : null;
        private Token Take() {
            var c = Current;
            index++;
            c.ChangeIndentLevel(indentLevel);
            c.Context = CurrentContext;
            return c;
        }
        private Token Take(SyntaxKind kind) {
            if (Current.Kind != kind) throw new Exception($"Expected token of kind '{kind}' but received token of kind'{Current.Kind}'.");
            return Take();
        }
        private IEnumerable<Token> TakeWhile(Predicate<Token> p, int indentLevel = 0) {
            while (Current != null && p(Current)) {
                yield return Current.ChangeIndentLevel(indentLevel);
            }
        }

        public ContextualTokenizer(List<Token> tokens, ErrorSink errorSink) {
            this.Tokens = tokens;
            this.ErrorSink = errorSink;
            max = this.Tokens.Count;
        }


        /// <summary>
        /// Aggregate all the parts between string wrap tokens " Something " and
        /// combine these into a string literal token. Later on we will parse the
        /// contextual segments out of the string literal.
        /// 
        /// Example: "Something"
        /// Example 2: "{a} is a word"  <-- valiable can be found within the scope
        /// </summary>
        /// <returns></returns>
        private Token AggregateStringLiteralToken() {
            List<Token> parts = new List<Token> { (Token)Take(SyntaxKind.DoubleQuoteToken) };
            while (Current.Kind != SyntaxKind.DoubleQuoteToken) {
                parts.Add((Token)Take());
            }
            parts.Add((Token)Take(SyntaxKind.DoubleQuoteToken));

            return new Token(parts, SyntaxKind.StringLiteralToken, indentLevel);
        }

        private Token ParseAnnotation() {
            var tokens = new List<Token> { Take() };
            while (Current.Kind != SyntaxKind.NewLineToken) {
                tokens.Add(Take());
            }
            return new Token(tokens, SyntaxKind.AnnotationToken, indentLevel);
        }

       

        internal IEnumerable<TokenBlock> Tokenize(ContextType contextType = ContextType.None) {
            while (index < max) {
                if (Current?.Kind == SyntaxKind.TypeDefinitionToken) {
                    yield return TokenizeTypeDefinition();
                }
                else if (Current?.Kind == SyntaxKind.NewLineToken) {
                    Take();
                }
                else {
                    // We are probably in a markdown block and will interpert it like so...
                    yield return Markdown();
                }
            }
        }


        /*

        internal IEnumerable<Token> Tokenize_old(ContextType contextType = ContextType.None) {

            CurrentContext = contextType;

            while (index < max) {
                if (Current.Kind == SyntaxKind.DoubleQuoteToken) {
                    // we will, in the future, be able to create a full string parser/builder
                    // with parameter substitution and interpolation. For now, just aggregate 
                    // the string.
                    yield return AggregateStringLiteralToken();
                }
                else if (
                    CurrentContext == ContextType.FunctionDeclaration &&    //  func
                    Current.Kind == SyntaxKind.EqualsToken &&
                    Next?.Kind == SyntaxKind.GreaterThenToken) {            //  =>
                    yield return new Token(new List<Token> { Take(), Take() }, SyntaxKind.LambdaToken, indentLevel);
                }
                else if (
                    CurrentContext == ContextType.LanguageDeclaration &&
                    Current.Kind == SyntaxKind.MinusToken &&
                    Next?.Kind == SyntaxKind.GreaterThenToken) {
                    yield return new Token(new List<Token> { Take(), Take() }, SyntaxKind.NextParameterToken, indentLevel);
                }
                else if (Current.Kind == SyntaxKind.AmpersandToken) {
                    yield return ParseAnnotation();
                }
                else if (Current.Kind == SyntaxKind.RecordDeclarationToken) {
                    CurrentContext = ContextType.LanguageDeclaration;
                    yield return Take();
                }
                else if (Current.Kind == SyntaxKind.TypeDefinitionToken) {
                    CurrentContext = ContextType.LanguageDeclaration;
                    yield return Take();
                }
                else if (Current.Kind == SyntaxKind.FuncDefinitionToken) {
                    CurrentContext = ContextType.FunctionDeclaration;
                    yield return Take();
                }
                else if (CurrentContext == ContextType.LanguageDeclaration && Current.Kind == SyntaxKind.ColonToken && Next?.Kind == SyntaxKind.ColonToken) {
                    yield return new Token(new List<Token>() { Take(), Take() }, SyntaxKind.TypeDefToken, indentLevel);
                    indentLevel++;
                }
                else if (Current.Kind == SyntaxKind.SingleQuoteToken && CurrentContext == ContextType.LanguageDeclaration) {
                    if (Next?.Kind != SyntaxKind.IdentifierToken) {
                        ErrorSink.AddError(new Error(
                            @"Expected an Identifier after a ' as a ' signifies a generic parameter within the context of a type definition.",
                            Next ?? Current
                        ));
                        yield return Take();
                    }
                    else {
                        yield return new Token(new List<Token> { Take(), Take() }, SyntaxKind.GenericParameterToken, indentLevel);
                    }
                }
                else if (Current.Kind == SyntaxKind.SemiColonToken || Current.Kind == SyntaxKind.EndBlock) {
                    Take();
                    yield return new Token("", SyntaxKind.EndBlock, Current);
                    indentLevel--;
                }
                else if (Current.Kind == SyntaxKind.NewLineToken && Next?.Kind != SyntaxKind.IndentToken && Next?.Kind != SyntaxKind.NewLineToken) {
                    if (CurrentContext == ContextType.LanguageDeclaration) {
                        CurrentContext = ContextType.None;
                        yield return new Token("", SyntaxKind.EndBlock, Current);
                    }
                    Take();
                    indentLevel = 0;
                }
                else if (Current.Kind == SyntaxKind.WhiteSpaceToken || Current.Kind == SyntaxKind.NewLineToken || Current.Kind == SyntaxKind.IndentToken) {
                    // do not yield whitepaces, newlines or indentations
                    Take();
                }
                else {
                    yield return Take();
                }
            }

        }
        */

    }

    public enum ContextType {
        None,
        LanguageDeclaration,
        TypeDeclaration,
        FunctionDeclaration,
        Markdown,
        VariableDef
    }
}
