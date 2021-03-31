
using System;
using System.Linq;
using System.Collections.Generic;

namespace Compiler.Symbols {
    public class Lexer {
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

        public Lexer(SourceCode sourceCode, ErrorSink errorSink) {
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
        private char take() {
            var c = current;
            value += c;
            moveNext();
            return c;
        }

        private string takeWhile(Predicate<char> check) {
            while (check(current)) {
                take();
            }
            return value;
        }
        private string takeWhile(Func<bool> check) {
            while (check()) {
                take();
            }
            return value;
        }
        private Token pushToken(SyntaxKind kind, string v) {
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
        private Token pushToken(SyntaxKind kind) {
            return pushToken(kind, value);
        }

        private Token parseWhiteSpace() {
            while (isWhiteSpace(current)) {
                take();
                if (value.Length == 4) {
                    return pushToken(SyntaxKind.IndentToken);
                }
            }
            return pushToken(SyntaxKind.WhiteSpaceToken);
        }

        private Token parseNewline() {

            if (current == '\r' && next == '\n') {
                take();
                take();
            }
            else if (current == '\n') {
                take();
            }
            var token = pushToken(SyntaxKind.NewLineToken, System.Environment.NewLine);
            moveNextLine();
            return token;
        }
        private Token parseWord() {
            if (isCharacter(current)) take();
            while (isCharacter(current) || isNumber(current)) {
                take();
            }

            Mappings.Keywords.TryGetValue(value, out SyntaxKind kind);
            if (kind == SyntaxKind.Unknown) {
                kind = SyntaxKind.IdentifierToken;
            }

            return pushToken(kind);
        }

        private Token parseOperator() {
            if (isOperator(current)) {
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

        private Token parseComment() {
            var _indexStart = index;
            var _lineStart = line;
            var _lineTokenStartIndex = lineTokenIndex;
            while (next != char.MaxValue) {
                if (current == '*' && next == '}') {
                    take();
                    take();
                    break;
                }
                if (current == '\n') {
                    take();
                    moveNextLine();
                } 
                else {
                    take();
                }
            }
            var _lineEnd = line;
            var _indexEnd = index;
            var _lineTokenEndIndex = lineTokenIndex;

            var token = new Token(
                value: value,
                kind: SyntaxKind.CommentLiteral,
                indexStart: _indexStart,
                indexEnd: _indexEnd,
                columnStart: _lineTokenStartIndex,
                columnEnd: _lineTokenEndIndex,
                lineStart: _lineStart,
                lineEnd: _lineEnd
            );

            tokenStartIndex = index;
            lineTokenStartIndex = lineTokenIndex;
            value = "";

            return token;
        }

        private static bool isWhiteSpace(char c) {
            return c == ' ';
        }
        private static bool isNewline(char c) {
            return c == '\n' || c == '\r';
        }
        private static bool isCharacter(char c) {
            return Mappings.Letters.Contains(c) || c == '_';
        }
        private static bool isNumber(char c) {
            return Mappings.Numbers.Contains(c);
        }
        private static bool isOperator(char c) {
            return Mappings.Operators.Contains(c);
        }

        private static bool isBeginComment(char c, char n) {
            return c == '{' && n == '*';
        }

        private static bool isEndComment(char c, char n) {
            return c == '*' && n == '}';
        }

        public IEnumerable<Token> Tokenize(ContextType contextType) {
            var tokens = new List<Token>();

            while (index < max) {
                if (isWhiteSpace(current)) {
                    tokens.Add(parseWhiteSpace());
                }
                else if (isBeginComment(current, next)) {
                    tokens.Add(parseComment());
                }
                else if (isNewline(current)) {
                    tokens.Add(parseNewline());
                }
                else if (isCharacter(current)) {
                    tokens.Add(parseWord());
                }
                else if (isNumber(current)) {
                    tokens.Add(parseNumber());
                }
                else if (isOperator(current)) {
                    tokens.Add(parseOperator());
                }
                else if (current >= 0x00 && current <= 0x7F) {
                    // these are the invalid ASCII characters
                    // these I'd call editor bugs...
                    index++;
                }
                else {
                    Console.WriteLine($"Invalid Token: [pos {index}] " + current.ToString() + $" key code: {(int)current}");
                    index++;
                }
            }

            return GenerateBlocks(tokens);
        }


        public IEnumerable<Token> GenerateBlocks(IEnumerable<Token> tokens) {

            var t = tokens.ToList();
            var max = t.Count;
            var inContext = false;
            for (int i = 0; i < max; ++i) {
                var previous = i > 0 ? t[i - 1] : null;
                var token = t[i];
                var next = i + 1 < max ? t[i + 1] : null;

                if (!inContext && previous?.Kind == SyntaxKind.NewLineToken && (Mappings.Keywords.ContainsKey(token.Value) || token.Kind == SyntaxKind.PercentageToken || token.Kind == SyntaxKind.AmpersandToken)) {
                    yield return new Token(SyntaxKind.StartBlock);
                    inContext = true;
                    yield return token;
                }
                else if (token.Kind == SyntaxKind.NewLineToken && i + 1 < max && t[i + 1].Kind == SyntaxKind.NewLineToken) {
                    yield return token;
                }
                else if (inContext && token.Kind == SyntaxKind.NewLineToken) {
                    int depth = 0;
                    var depthTokens = new List<Token> { token };

                    while (i + 1 < max && t[i + 1].Kind == SyntaxKind.IndentToken) {
                        depth++;
                        i++;
                        depthTokens.Add(t[i]);
                    }

                    if (depth == 0 && (Mappings.Keywords.ContainsKey(next?.Value ?? "--undef__") || next?.Kind == SyntaxKind.PercentageToken || next?.Kind == SyntaxKind.AmpersandToken)) {
                        yield return token;
                        if (inContext) {
                            yield return new Token(SyntaxKind.EndBlock);
                            inContext = false;
                        }
                    }
                    else if (depth == 0 && i + 1 < max) {
                        yield return token;
                        if (inContext) {
                            yield return new Token(SyntaxKind.EndBlock);
                            inContext = false;
                        }
                    }
                    else if (inContext && depth == 1) {
                        yield return new Token(depthTokens, SyntaxKind.ContextualIndent1);
                    }
                    else if (inContext && depth == 2) {
                        yield return new Token(depthTokens, SyntaxKind.ContextualIndent2);
                    }
                    else if (inContext && depth == 3) {
                        yield return new Token(depthTokens, SyntaxKind.ContextualIndent3);
                    }
                    else if (inContext && depth == 4) {
                        yield return new Token(depthTokens, SyntaxKind.ContextualIndent4);
                    }
                    else if (inContext && depth == 5) {
                        yield return new Token(depthTokens, SyntaxKind.ContextualIndent5);
                    }
                    else yield return token;
                }
                else {
                    yield return token;
                }


            }
            if (inContext) {
                yield return new Token(SyntaxKind.EndBlock);
            }

        }


    }
}
