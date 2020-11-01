using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {
    public class Token : ISourceSegment, IEqualityComparer {

        /// <summary>
        /// Start position in the entire text
        /// </summary>
        public int indexStart { get; }

        /// <summary>
        /// End position in the entire text
        /// </summary>
        public int indexEnd { get; }

        /// <summary>
        /// Where on the line does the token start
        /// </summary>
        public int columnStart { get; }

        /// <summary>
        /// Where on the line does the token end
        /// </summary>
        public int columnEnd { get; }

        /// <summary>
        /// The line on which the token can be found
        /// </summary>
        public int line { get; }

        public int lineStart { get; }

        public int lineEnd { get; }

        /// <summary>
        /// Value of the token
        /// </summary>
        public string value { get; }

        /// <summary>
        /// The SyntaxKind of the token
        /// </summary>
        public SyntaxKind kind { get; }

        public int indentLevel { get; set; } = 0;

        public Token(string value, SyntaxKind kind, int indexStart, int indexEnd, int columnStart, int columnEnd, int line, int indentLevel = 0) {
            this.kind = kind;
            this.value = value;
            this.indexStart = indexStart;
            this.indexEnd = indexEnd;
            this.columnStart = columnStart;
            this.columnEnd = columnEnd;
            this.line = line;
            this.lineStart = line;
            this.lineEnd = line;
            this.indentLevel = indentLevel;
        }

        public Token(string value, SyntaxKind kind, int indexStart, int indexEnd, int columnStart, int columnEnd, int lineStart, int lineEnd, int indentLevel = 0) {
            this.kind = kind;
            this.value = value;
            this.indexStart = indexStart;
            this.indexEnd = indexEnd;
            this.columnStart = columnStart;
            this.columnEnd = columnEnd;
            this.line = lineStart;
            this.lineStart = lineStart;
            this.lineEnd = lineEnd;
            this.indentLevel = indentLevel;
        }

        public Token(Token original, ISourceSegment from, ISourceSegment to) {
            this.kind = original.kind;
            this.value = original.value;
            this.indexStart = from.indexStart;
            this.indexEnd = to.indexEnd;
            this.columnStart = from.columnStart;
            this.columnEnd = to.columnEnd;
            this.line = from.lineStart;
            this.lineStart = from.lineStart;
            this.lineEnd = to.lineEnd;
            this.indentLevel = original.indentLevel;
        }

        public Token(string value, SyntaxKind kind, ISourceSegment from, ISourceSegment to, int indentLevel = 0) {
            this.kind = kind;
            this.value = value;
            this.indexStart = from.indexStart;
            this.indexEnd = to.indexEnd;
            this.columnStart = from.columnStart;
            this.columnEnd = to.columnEnd;
            this.line = from.lineStart;
            this.lineStart = from.lineStart;
            this.lineEnd = to.lineEnd;
            this.indentLevel = indentLevel;
        }

        public Token(List<Token> tokens, SyntaxKind kind, int indentLevel = 0): 
            this(
                string.Join("", tokens.Select(t => t.value)), 
                kind, 
                tokens.First(), 
                tokens.Last(),
                indentLevel) { }

        public override string ToString() {
            return $"{kind} - '{value}'";
        }

        public new bool Equals(object x, object y) {
            if (x is Token tx) {
                if (y is string s) {
                    return tx.value == s;
                }
                else if (y is SyntaxKind k) {
                    return tx.kind == k;
                }
                else {
                    return false;
                }
            }
            else if (y is Token ty) {
                if (x is string s) {
                    return ty.value == s;
                }
                else if (x is SyntaxKind k) {
                    return ty.kind == k;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }

        public int GetHashCode(object obj) {
            if (obj is Token t) {
                return t.value.GetHashCode() + t.kind.GetHashCode();
            }
            else {
                return obj.GetHashCode();
            }
        }

        public static ISourceSegment Range(ISourceSegment from, ISourceSegment to) {
            return new SourceSegment {
                lineStart = from.lineStart,
                lineEnd = to.lineEnd,
                columnStart = from.columnStart,
                columnEnd = to.columnEnd,
                indexStart = from.indexStart,
                indexEnd = to.indexEnd
            };
        }

        //public static Token From(string value, SyntaxKind kind, ISourceSegment position, int indentLevel = 0) {
        //    return new Token(
        //        value,
        //        kind,
        //        position.indexStart,
        //        position.indexEnd,
        //        position.columnStart,
        //        position.columnEnd,
        //        position.lineStart,
        //        position.lineEnd,
        //        indentLevel
        //    );
        //}
    }
}