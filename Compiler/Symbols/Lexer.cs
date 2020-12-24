using System;
using System.Linq;
using System.Collections.Generic;

namespace Compiler.Symbols
{
    public class Lexer
    {
        private SourceCode SourceCode { get; }
        public ErrorSink ErrorSink { get; }

        private readonly string code;
        private int tokenStartIndex = 0;
        private int index = 0;
        private int lineTokenStartIndex = 0;
        private int lineTokenIndex = 0;
        private int line = 0;
        private readonly int max;
        private string value = "";
        private char current => this.code[this.index];
        private int currentCode => (int)this.code[this.index];
        private char next => this.index + 1 < max ? this.code[this.index + 1] : char.MaxValue;

        public Lexer(SourceCode sourceCode, ErrorSink errorSink)
        {
            this.SourceCode = sourceCode;
            this.ErrorSink = errorSink;
            this.max = this.SourceCode.Max;
            this.code = this.SourceCode.Code;
        }
        private void moveNext() {
            index++;
            lineTokenIndex++;
        }
        private void moveNextLine() {
            line++;
            lineTokenIndex = 0;
            lineTokenStartIndex = 0;
        }
        private char take()
        {
            var c = current;
            value += c;
            moveNext();
            return c;
        }

        private string takeWhile(Predicate<char> check) {
            while(check(current)) {
                take();
            }
            return value;
        }
        private Token pushToken(SyntaxKind kind, string v)
        {
            var token = new Token(
                value = v,
                kind,
                indexStart: tokenStartIndex,
                indexEnd: index,
                columnStart: lineTokenStartIndex,
                columnEnd: lineTokenIndex,
                line: line
            );

            tokenStartIndex = index;
            lineTokenStartIndex = lineTokenIndex;
            value = "";

            return token;
        }
        private Token pushToken(SyntaxKind kind)
        {
            return pushToken(kind, value);
        }

        private Token parseWhiteSpace()
        {
            while (isWhiteSpace(current))
            {
                take();
                if (value.Length == 4) {
                    return pushToken(SyntaxKind.IndentToken);
                }
            }
            return pushToken(SyntaxKind.WhiteSpaceToken);
        }
        private Token parseNewline()
        {
            if (current == '\r' && next == '\n') {
                take();
                take();
            }
            else if (current == '\n') {
                take();
            }
            var token = pushToken(SyntaxKind.NewLineToken);
            moveNextLine();
            return token;
        }
        private Token parseWord()
        {
            if (isCharacter(current)) take();
            while (isCharacter(current) || isNumber(current))
            {
                take();
            }

            Mappings.Keywords.TryGetValue(value, out SyntaxKind kind);
            if (kind == SyntaxKind.Unknown) {
                kind = SyntaxKind.IdentifierToken;
            }

            return pushToken(kind);
        }

        private Token parseOperator()
        {
            if (isOperator(current))
            {
                take();
            }
            Mappings.SingleOperatorDefinitions.TryGetValue(value, out SyntaxKind kind);
            if (kind == SyntaxKind.Unknown) {

                kind = SyntaxKind.OperatorToken;
            }
            
            return pushToken(kind);
        }

        private Token parseNumber() {
            takeWhile(isNumber);
            if (current == '.') take();
            takeWhile(isNumber);
            if (current == 'e') {
                take();
                takeWhile(isNumber);
            }
            return pushToken(SyntaxKind.NumberLiteralToken);
        }

        private bool isWhiteSpace(char c)
        {
            return c == ' ';
        }
        private bool isNewline(char c)
        {
            return c == '\n' || c == '\r';
        }
        private bool isCharacter(char c)
        {
            return Mappings.Letters.Contains(c) || c == '_';
        }
        private bool isNumber(char c) {
            return Mappings.Numbers.Contains(c);
        }
        private bool isOperator(char c)
        {
            return Mappings.Operators.Contains(c);
        }

        public IEnumerable<Token> Tokenize(ContextType contextType) {
            while (index < max) {
                if (isWhiteSpace(current)) {
                    yield return parseWhiteSpace();
                }
                else if (isNewline(current)) {
                    yield return parseNewline();
                }
                else if (isCharacter(current)) {
                    yield return parseWord();
                }
                else if (isNumber(current)) {
                    yield return parseNumber();
                }
                else if (isOperator(current)) {
                    yield return parseOperator();
                }
                else if (current == Convert.ToChar(0x7F)) {
                    index++;
                }
                else {
                    Console.WriteLine(current);
                    throw new Exception("Invalid token");
                }
            }
        }

       


    }
}
