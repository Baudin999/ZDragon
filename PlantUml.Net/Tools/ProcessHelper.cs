using System.Diagnostics;

namespace PlantUmlCk.Tools
{
    internal class ProcessHelper
    {
        public IProcessResult RunProcessWithInput(string fileName, string arguments, string input)
        {
            ProcessStartInfo processStartInfo = GetProcessStartInfo(fileName, arguments);

            using (Process? process = Process.Start(processStartInfo))
            {
                process?.WriteInput(input);
                return new ProcessResult
                {
                    Output = process?.GetOutput() ?? new byte[0],
                    Error = process?.GetError() ?? new byte[0],
                    ExitCode = process?.ExitCode ?? 1
                };
            }
        }

        private static ProcessStartInfo GetProcessStartInfo(string command, string arguments)
        {
            return new ProcessStartInfo(command)
            {
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false,
                CreateNoWindow = true,
                Arguments = arguments
            };
        }
    }
}
