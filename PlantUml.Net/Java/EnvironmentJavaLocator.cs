using System;
using System.IO;
using System.Linq;

namespace PlantUmlCk.Java
{
    internal class EnvironmentJavaLocator : IJavaLocator
    {
        public string GetJavaInstallationPath()
        {
            var variables = Environment.GetEnvironmentVariables();
            string javaHome = Environment.GetEnvironmentVariable("JAVA_HOME").Trim('"');

            return Path.Combine(javaHome, "bin", "java.exe");
        }
    }
}
