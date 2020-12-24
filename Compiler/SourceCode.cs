using System;
using System.Linq;

namespace Compiler {
    public class SourceCode {
        private readonly string code;
        private readonly int max;
        private readonly string joinCharacter;

        public string Code => this.code;
        public int Max => this.max;
        public string JoinCharacter => joinCharacter;


        public SourceCode(string code) {
            if (code.Contains("\r\n"))
                joinCharacter = "\r\n";
            else
                joinCharacter = "\n";

            var lines = code.Split(JoinCharacter);
            var newCode = string.Join(JoinCharacter, lines.Select(s => s.TrimEnd()));
            
            this.code = newCode + Convert.ToChar(0x7F);
            this.max = this.Code.Length;
        }
    }

}