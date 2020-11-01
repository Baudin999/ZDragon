

using System;

namespace Compiler
{
    public class SourceCode
    {
        private readonly string code;
        public string Code => this.code;
        private readonly int max;
        public int Max => this.max;



        public SourceCode(string code)
        {
            this.code = code + Convert.ToChar(0x7F);
            this.max = this.Code.Length;
        }
    }

}