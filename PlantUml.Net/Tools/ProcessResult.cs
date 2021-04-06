using System;
using System.IO;

namespace PlantUmlCk.Tools
{
    internal class ProcessResult : IProcessResult
    {
        public byte[] Output { get; set; }

        public byte[] Error { get; set; }

        public int ExitCode { get; set; }
    }
}