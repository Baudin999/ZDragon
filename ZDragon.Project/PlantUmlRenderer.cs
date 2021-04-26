
using System;
using System.Diagnostics;
using System.IO;

namespace ZDragon.Project {
    public class PlantUmlRenderer {
        public static byte[] Render(string puml, bool localRendering) {
            try {
                var currentPath = Directory.GetCurrentDirectory();
                var plantUmlPath = Path.Combine(currentPath, "PlantUml");
                var plantUmlJarPath = Path.Combine(plantUmlPath, "plantuml.jar");

                var variables = Environment.GetEnvironmentVariables();
                string javaHome = Environment.GetEnvironmentVariable("JAVA_HOME")?.Trim('"') ?? "";
                string javaPath = Path.Combine(javaHome, "bin", "java.exe");

                if (File.Exists(javaPath) && File.Exists(plantUmlJarPath)) {
                    var arguments = $" -jar \"{plantUmlJarPath}\" -DRELATIVE_INCLUDE=\"{plantUmlPath}\" -headless -tsvg -pipe";

                    var processStartInfo = GetProcessStartInfo(javaPath, arguments);

                    using (Process? process = Process.Start(processStartInfo)) {
                        process?.WriteInput(puml);

                        var Output = process?.GetOutput() ?? new byte[0];
                        var Error = process?.GetError() ?? new byte[0];
                        var ExitCode = process?.ExitCode ?? 1;

                        return Output;
                    }

                }

                return new byte[0];
            }
            catch (Exception ex) {

                ZDragon.Project.Project.CurrentProject?.SendMessage(@$"
Failed to generate PlantUML diagram:

{ex.Message}
");

                throw new Exception("Failed to generate a correct PlantUml diagram.");
            }
        }

        private static ProcessStartInfo GetProcessStartInfo(string command, string arguments) {
            return new ProcessStartInfo(command) {
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

    public static class ProcessExtensions {
        public static void WriteInput(this Process process, string input) {
            using (StreamWriter stdIn = process.StandardInput) {
                stdIn.AutoFlush = true;
                stdIn.Write(input);
                stdIn.Close();
            }
        }

        public static byte[] GetOutput(this Process process) {
            return ExtractBytes(process.StandardOutput.BaseStream);
        }

        public static byte[] GetError(this Process process) {
            return ExtractBytes(process.StandardError.BaseStream);
        }

        private static byte[] ExtractBytes(Stream stream) {
            using (var memoryStream = new MemoryStream()) {
                stream.CopyTo(memoryStream);
                return memoryStream.ToArray();
            }
        }
    }
}
