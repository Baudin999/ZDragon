using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Compiler.Symbols {
    public class Token : ISourceSegment, IEqualityComparer {

        /// <summary>
        /// Start position in the entire text
        /// </summary>
        public int IndexStart { get; }

        /// <summary>
        /// End position in the entire text
        /// </summary>
        public int IndexEnd { get; }

        /// <summary>
        /// Where on the line does the token start
        /// </summary>
        public int ColumnStart { get; }

        /// <summary>
        /// Where on the line does the token end
        /// </summary>
        public int ColumnEnd { get; }

        /// <summary>
        /// The line on which the token can be found
        /// </summary>
        public int Line { get; }

        public int LineStart { get; }

        public int LineEnd { get; }

        /// <summary>
        /// Value of the token
        /// </summary>
        public string Value { get; }

        /// <summary>
        /// The SyntaxKind of the token
        /// </summary>
        public SyntaxKind Kind { get; }

        public int IndentLevel { get; private set; } = 0;

        public ContextType Context { get; set; } = ContextType.None;

        internal Token ChangeIndentLevel(int indentLevel) {
            this.IndentLevel = indentLevel;
            return this;
        }

        public Token(string value, SyntaxKind kind, int indexStart, int indexEnd, int columnStart, int columnEnd, int line, int indentLevel = 0) {
            this.Value = value;
            this.Kind = kind;
            this.IndexStart = indexStart;
            this.IndexEnd = indexEnd;
            this.ColumnStart = columnStart;
            this.ColumnEnd = columnEnd;
            this.Line = line;
            this.LineStart = line;
            this.LineEnd = line;
            this.IndentLevel = indentLevel;
        }

        public Token(string value, SyntaxKind kind, int indexStart, int indexEnd, int columnStart, int columnEnd, int lineStart, int lineEnd, int indentLevel = 0) {
            this.Value = value;
            this.Kind = kind;
            this.IndexStart = indexStart;
            this.IndexEnd = indexEnd;
            this.ColumnStart = columnStart;
            this.ColumnEnd = columnEnd;
            this.Line = lineStart;
            this.LineStart = lineStart;
            this.LineEnd = lineEnd;
            this.IndentLevel = indentLevel;
        }

        public Token(string value, SyntaxKind kind, ISourceSegment position, int indentLevel = 0) {
            this.Value = value;
            this.Kind = kind;
            this.IndexStart = position.IndexStart;
            this.IndexEnd = position.IndexEnd;
            this.ColumnStart = position.ColumnStart;
            this.ColumnEnd = position.ColumnEnd;
            this.Line = position.LineStart;
            this.LineStart = position.LineStart;
            this.LineEnd = position.LineEnd;
            this.IndentLevel = indentLevel;
        }

        public Token(Token original, ISourceSegment from, ISourceSegment to) {
            this.Value = original.Value;
            this.Kind = original.Kind;
            this.IndexStart = from.IndexStart;
            this.IndexEnd = to.IndexEnd;
            this.ColumnStart = from.ColumnStart;
            this.ColumnEnd = to.ColumnEnd;
            this.Line = from.LineStart;
            this.LineStart = from.LineStart;
            this.LineEnd = to.LineEnd;
            this.IndentLevel = original.IndentLevel;
        }

        public Token(string value, SyntaxKind kind, ISourceSegment from, ISourceSegment to, int indentLevel = 0) {
            this.Value = value;
            this.Kind = kind;
            this.IndexStart = from.IndexStart;
            this.IndexEnd = to.IndexEnd;
            this.ColumnStart = from.ColumnStart;
            this.ColumnEnd = to.ColumnEnd;
            this.Line = from.LineStart;
            this.LineStart = from.LineStart;
            this.LineEnd = to.LineEnd;
            this.IndentLevel = indentLevel;
        }

        public Token(List<Token?> tokens, SyntaxKind kind, int indentLevel = 0): 
#pragma warning disable CS8604 // Possible null reference argument.
            this(
#pragma warning disable CS8602 // Dereference of a possibly null reference.
                string.Join("", tokens.Where(t => t != null).Select(t => t.Value)),
#pragma warning restore CS8602 // Dereference of a possibly null reference.
                kind, 
                tokens.Where(t => t != null).First(),
                tokens.Where(t => t != null).Last(),
                indentLevel) { }
#pragma warning restore CS8604 // Possible null reference argument.

        public override string ToString() {
            return $"{Kind} - '{Value}'";
        }

        public new bool Equals(object x, object y) {
            if (x is Token tx) {
                if (y is string s) {
                    return tx.Value == s;
                }
                else if (y is SyntaxKind k) {
                    return tx.Kind == k;
                }
                else {
                    return false;
                }
            }
            else if (y is Token ty) {
                if (x is string s) {
                    return ty.Value == s;
                }
                else if (x is SyntaxKind k) {
                    return ty.Kind == k;
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
                return t.Value.GetHashCode() + t.Kind.GetHashCode();
            }
            else {
                return obj.GetHashCode();
            }
        }

        public static ISourceSegment Range(ISourceSegment from, ISourceSegment to) {
            if (from is null || to is null) {
                throw new System.Exception("Could not resolve range");
            }

            return new SourceSegment {
                LineStart = from.LineStart,
                LineEnd = to.LineEnd,
                ColumnStart = from.ColumnStart,
                ColumnEnd = to.ColumnEnd,
                IndexStart = from.IndexStart,
                IndexEnd = to.IndexEnd
            };
        }

        public static ISourceSegment DefaultSourceSegment() {
            return new SourceSegment {
                ColumnEnd = 0,
                ColumnStart = 0,
                IndexEnd = 0,
                IndexStart = 0,
                LineStart = 0,
                LineEnd = 0
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