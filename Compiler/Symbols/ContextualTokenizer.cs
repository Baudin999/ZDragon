using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices.ComTypes;
using System.Text;
using System.Threading.Tasks;

namespace Compiler.Symbols {
    internal class ContextualTokenizer {
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
            c.indentLevel = indentLevel;
            c.context = CurrentContext;
            return c;
        }
        private Token Take(SyntaxKind kind) {
            if (Current.kind != kind) throw new Exception($"Expected token of kind '{kind}' but received token of kind'{Current.kind}'.");
            return Take();
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
            List<Token> parts = new List<Token> { (Token)Take(SyntaxKind.DoubleQuoteToken) } ;
            while (Current.kind != SyntaxKind.DoubleQuoteToken) {
                parts.Add((Token)Take());
            }
            parts.Add((Token)Take(SyntaxKind.DoubleQuoteToken));

            return new Token(parts, SyntaxKind.StringLiteralToken, indentLevel);
        }

        private Token ParseAnnotation() {
            var tokens = new List<Token> { Take() };
            while (Current.kind != SyntaxKind.NewLineToken) {
                tokens.Add(Take());
            }
            return new Token(tokens, SyntaxKind.AnnotationToken, indentLevel);
        }

        internal IEnumerable<Token> Tokenize(ContextType contextType = ContextType.None) {
            
            CurrentContext = contextType;

            while (index < max) {
                if (Current.kind == SyntaxKind.WhiteSpaceToken) {
                    // do nothing and ignore whitespace
                    Take();
                }
                else if (Current.kind == SyntaxKind.DoubleQuoteToken) {
                    yield return AggregateStringLiteralToken();
                }
                else if (
                    CurrentContext == ContextType.FunctionDef && 
                    Current.kind == SyntaxKind.EqualsToken && 
                    Next?.kind == SyntaxKind.GreaterThenToken) {
                    yield return new Token(new List<Token> { Take(), Take() }, SyntaxKind.LambdaToken, indentLevel);
                }
                else if (
                    CurrentContext == ContextType.LanguageDeclaration && 
                    Current.kind == SyntaxKind.MinusToken && 
                    Next?.kind == SyntaxKind.GreaterThenToken) {
                    yield return new Token(new List<Token> { Take(), Take() }, SyntaxKind.NextParameterToken, indentLevel);
                }
                else if (Current.kind == SyntaxKind.AmpersandToken) {
                    yield return ParseAnnotation();
                }
                else if (Current.kind == SyntaxKind.RecordDeclarationToken) {
                    CurrentContext = ContextType.LanguageDeclaration;
                    yield return Take();
                }
                else if (Current.kind == SyntaxKind.TypeDefinitionToken) {
                    CurrentContext = ContextType.LanguageDeclaration;
                    yield return Take();
                }
                else if (CurrentContext == ContextType.LanguageDeclaration && Current.kind == SyntaxKind.ColonToken && Next?.kind == SyntaxKind.ColonToken) {
                    yield return new Token(new List<Token>() { Take(), Take() }, SyntaxKind.TypeDefToken, indentLevel);
                    indentLevel++;
                }
                else if (Current.kind == SyntaxKind.SingleQuoteToken && CurrentContext == ContextType.LanguageDeclaration) {
                    if (Next?.kind != SyntaxKind.IdentifierToken) {
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
                else if (Current.kind == SyntaxKind.SemiColonToken) {
                    yield return Take();
                    indentLevel--;
                }
                else if (Current.kind == SyntaxKind.NewLineToken && Next?.kind != SyntaxKind.IndentToken) {
                    if (CurrentContext == ContextType.LanguageDeclaration) {
                        CurrentContext = ContextType.None;
                        yield return new Token("", SyntaxKind.EndBlock, Current);
                    }
                    yield return Take();
                    indentLevel = 0;
                }
                else {
                    yield return Take();
                }
            }
        }

    }

    public enum ContextType {
        None,
        LanguageDeclaration,
        Markdown,
        VariableDef,
        FunctionDef
    }
}
