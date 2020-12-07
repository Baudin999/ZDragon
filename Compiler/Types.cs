

using Compiler.Language;
using Compiler.Language.Nodes;
using Compiler.Symbols;
using System.Collections.Generic;
using System.Linq;

namespace Compiler {

    

    public static class Mappings {
        public static List<int> Operators = new List<int> {
                0x26,               // &
                0x2A,               // *
                0x40,               // @
                0x5C,               // \
                0x60,               // `
                0x7C,               // |
                0x5E,               // ^
                0x7D,               // }
                0x5D,               // ]
                0x29,               // )
                0x3A,               // :
                0x2C,               // ,
                0x2E,               // .
                0x22,               // "
                0x3D,               // =
                0x21,               // !
                0x3E,               // >
                0x23,               // #
                0x3C,               // <
                0x2D,               // -
                0x7B,               // {
                0x5B,               // [
                0x28,               // (
                0x25,               // %
                0x2B,               // +
                0x3F,               // ?
                0x3B,               // ;
                0x27,               // '
                0x2F,               // /
                0x7E                // ~
            };

        public static Dictionary<string, SyntaxKind> CombinedOperatorDefinitions = new Dictionary<string, SyntaxKind> {
                { "=>", SyntaxKind.LambdaToken },
                { "::", SyntaxKind.TypeDefToken },
                { "{{", SyntaxKind.MarkdownStartBlockToken },
                { "}}", SyntaxKind.MarkdownEndBlockToken },
                { "..", SyntaxKind.RangeOperatorToken },
                { "...", SyntaxKind.SpreadOperatorToken },
            };

        public static Dictionary<string, SyntaxKind> SingleOperatorDefinitions = new Dictionary<string, SyntaxKind> {
                { "=", SyntaxKind.EqualsToken },
                { ">", SyntaxKind.GreaterThenToken },
                { "<", SyntaxKind.LessThenToken },
                { "(", SyntaxKind.ParanOpenToken },
                { ")", SyntaxKind.ParanCloseToken },
                { "{", SyntaxKind.BracketOpenToken },
                { "}", SyntaxKind.BracketCloseToken },
                { "\"", SyntaxKind.DoubleQuoteToken },
                { "'", SyntaxKind.SingleQuoteToken },
                { "+", SyntaxKind.PlusToken },
                { "-", SyntaxKind.MinusToken },
                { "*", SyntaxKind.StarToken },
                { "/", SyntaxKind.ForwardSlashToken },
                { "\\", SyntaxKind.BackSlashToken },
                { ",", SyntaxKind.CommaToken },
                { ".", SyntaxKind.DotToken },
                { "^", SyntaxKind.RaiseToken },
                { "~", SyntaxKind.TildeToken },
                { "#", SyntaxKind.HashToken },
                { "|", SyntaxKind.PipeToken },
                { "&", SyntaxKind.AndToken },
                { ":", SyntaxKind.ColonToken },
                { "%", SyntaxKind.PercentageToken },
                { "`", SyntaxKind.BacktickToken },
                { ";", SyntaxKind.SemiColonToken },
                { "@", SyntaxKind.AmpersandToken }
            };


        public static Dictionary<string, SyntaxKind> Keywords = new Dictionary<string, SyntaxKind> {
                { "record", SyntaxKind.RecordDeclarationToken },
                { "type", SyntaxKind.TypeDeclarationToken },
                { "data", SyntaxKind.DataDeclarationToken },
                { "choice", SyntaxKind.ChoiceDeclarationToken },
                { "if", SyntaxKind.IfToken },
                { "else", SyntaxKind.ElseToken },
                { "where", SyntaxKind.WhereToken },
                { "let", SyntaxKind.LetToken },
                { "extends", SyntaxKind.ExtendsToken },
                { "end", SyntaxKind.EndKeywordToken },
            };

        public static List<int> Letters = new List<int> {
            0x61, // a
            0x62, // b
            0x63, // c
            0x64, // d
            0x65, // e
            0x66, // f
            0x67, // g
            0x68, // h
            0x69, // i
            0x6A, // j
            0x6B, // k
            0x6C, // l
            0x6D, // m
            0x6E, // n
            0x6F, // o
            0x70, // p
            0x71, // q
            0x72, // r
            0x73, // s
            0x74, // t
            0x75, // u
            0x76, // v
            0x77, // w
            0x78, // x
            0x79, // y
            0x7A, // z

            0x41, // A
            0x42, // B
            0x43, // C
            0x44, // D
            0x45, // E
            0x46, // F
            0x47, // G
            0x48, // H
            0x49, // I
            0x4A, // J
            0x4B, // K
            0x4C, // L
            0x4D, // M
            0x4E, // N
            0x4F, // O 
            0x50, // P
            0x51, // Q
            0x52, // R
            0x53, // S
            0x54, // T
            0x55, // U
            0x56, // V
            0x57, // W
            0x58, // X
            0x59, // Y
            0x5a, // Z
        };

        public static List<int> Numbers = new List<int> {
            0x30, // 0
            0x31, // 1
            0x32, // 2
            0x33, // 3
            0x34, // 4
            0x35, // 5
            0x36, // 6
            0x37, // 7
            0x38, // 8
            0x39, // 9
        };
    }

    public enum SyntaxKind {
        Unknown,
        WhiteSpaceToken,
        NewLineToken,
        IndentToken,
        StartBlock,
        EndBlock,

        IdentifierToken,
        WordToken,

        // Documentation Parser
        MarkdownBlock,
        MarkdownStartBlockToken,
        MarkdownEndBlockToken,

        // dual operator Tokens
        OperatorToken,          // The default operator token
        /// <summary>
        /// =>
        /// </summary>
        LambdaToken,
        NextParameterToken,

        /// <summary>
        /// :: Double colon
        /// </summary>
        TypeDefToken,
        RangeOperatorToken,
        SpreadOperatorToken,

        // single operator tokens
        EqualsToken,
        GreaterThenToken,
        LessThenToken,
        ParanOpenToken,
        ParanCloseToken,
        BracketOpenToken,
        BracketCloseToken,
        CurlyOpenToken,
        CurlyCloseToken,
        PlusToken,
        MinusToken,
        StarToken,
        ForwardSlashToken,
        BackSlashToken,
        CommaToken,
        DotToken,
        RaiseToken,
        TildeToken,
        HashToken,
        PipeToken,
        AndToken,
        ColonToken,
        PercentageToken,
        BacktickToken,
        DoubleQuoteToken,
        SingleQuoteToken,
        SemiColonToken,
        AmpersandToken, 

        // Keywords
        WhereToken,
        RecordDeclarationToken,
        /// <summary>
        /// type
        /// </summary>
        TypeDeclarationToken,
        DataDeclarationToken,
        ChoiceDeclarationToken,
        EndKeywordToken,
        /// <summary>
        /// func
        /// </summary>
        FuncDefinitionToken,
        IfToken,
        ElseToken,
        LetToken,
        ExtendsToken,
        /// <summary>
        /// 'a 
        /// :apos:letters:
        /// </summary>
        GenericParameterToken,

        // literals
        StringWrapToken,
        StringLiteralToken,
        NumberLiteralToken,
        AnnotationToken,

        // Markup
        CloseMarkupElement
    }


    public class CompilationResult {
        public IEnumerable<TokenGroup> Tokens { get; }
        public List<AstNode> Ast { get; }
        public ErrorSink ErrorSink { get; }
        public Dictionary<string, AstNode?> Lexicon { get; }
        public List<Error> Errors() => ErrorSink.Errors;

        public CompilationResult(List<AstNode> ast, IEnumerable<TokenGroup> tokens, ErrorSink errorSink, Dictionary<string, AstNode?> lexicon) {
            this.Tokens = tokens.ToList();
            this.Ast = ast;
            this.ErrorSink = errorSink;
            this.Lexicon = lexicon;
        }
    }

    public enum CharacterCodes {
        nullCharacter = 0,
        maxAsciiCharacter = 0x7F,

        lineFeed = 0x0A,                // \n
        carriageReturn = 0x0D,          // \r

        // Unicode 3.0 space characters
        space = 0x0020,                 // " "
        nonBreakingSpace = 0x00A0,      //

        _0 = 0x30,
        _1 = 0x31,
        _2 = 0x32,
        _3 = 0x33,
        _4 = 0x34,
        _5 = 0x35,
        _6 = 0x36,
        _7 = 0x37,
        _8 = 0x38,
        _9 = 0x39,

        a = 0x61,
        b = 0x62,
        c = 0x63,
        d = 0x64,
        e = 0x65,
        f = 0x66,
        g = 0x67,
        h = 0x68,
        i = 0x69,
        j = 0x6A,
        k = 0x6B,
        l = 0x6C,
        m = 0x6D,
        n = 0x6E,
        o = 0x6F,
        p = 0x70,
        q = 0x71,
        r = 0x72,
        s = 0x73,
        t = 0x74,
        u = 0x75,
        v = 0x76,
        w = 0x77,
        x = 0x78,
        y = 0x79,
        z = 0x7A,

        A = 0x41,
        B = 0x42,
        C = 0x43,
        D = 0x44,
        E = 0x45,
        F = 0x46,
        G = 0x47,
        H = 0x48,
        I = 0x49,
        J = 0x4A,
        K = 0x4B,
        L = 0x4C,
        M = 0x4D,
        N = 0x4E,
        O = 0x4F,
        P = 0x50,
        Q = 0x51,
        R = 0x52,
        S = 0x53,
        T = 0x54,
        U = 0x55,
        V = 0x56,
        W = 0x57,
        X = 0x58,
        Y = 0x59,
        Z = 0x5a,

        ampersand = 0x26,               // &
        asterisk = 0x2A,                // *
        at = 0x40,                      // @
        backslash = 0x5C,               // \
        backtick = 0x60,                // `
        bar = 0x7C,                     // |
        caret = 0x5E,                   // ^
        closeBrace = 0x7D,              // }
        closeBracket = 0x5D,            // ]
        closeParen = 0x29,              // )
        colon = 0x3A,                   // :
        comma = 0x2C,                   // ,
        dot = 0x2E,                     // .
        doubleQuote = 0x22,             // "
        equals = 0x3D,                  // =
        exclamation = 0x21,             // !
        greaterThan = 0x3E,             // >
        hash = 0x23,                    // #
        lessThan = 0x3C,                // <
        minus = 0x2D,                   // -
        openBrace = 0x7B,               // {
        openBracket = 0x5B,             // [
        openParen = 0x28,               // (
        percent = 0x25,                 // %
        plus = 0x2B,                    // +
        question = 0x3F,                // ?
        semicolon = 0x3B,               // ;
        singleQuote = 0x27,             // '
        slash = 0x2F,                   // /
        tilde = 0x7E,                   // ~

        backspace = 0x08,               // \b
        formFeed = 0x0C,                // \f
        byteOrderMark = 0xFEFF,
        tab = 0x09,                     // \t
        verticalTab = 0x0B,             // \v
    }
}