using System;
using System.Collections.Generic;
using System.IO;

namespace Woezel.Project {
    public class FileWatcher : IDisposable {
        private readonly FileSystemWatcher watcher;
        private Dictionary<string, string> code = new Dictionary<string, string>();


        public FileWatcher() {
            watcher = new FileSystemWatcher {
                Path = @"C:\temp",
                IncludeSubdirectories = true,
                EnableRaisingEvents = true
            };

            // Watch for changes in LastAccess and LastWrite times, and
            // the renaming of files or directories.
            watcher.NotifyFilter = NotifyFilters.LastAccess
                                 | NotifyFilters.LastWrite
                                 | NotifyFilters.FileName
                                 | NotifyFilters.DirectoryName;


            // Add event handlers.
            watcher.Changed += OnChanged;
            watcher.Created += OnChanged;
            watcher.Deleted += OnChanged;
            watcher.Renamed += OnRenamed;
        }

        public void Dispose() {
            watcher.Dispose();
            code = new Dictionary<string, string>();
        }

        // Define the event handlers.
        private async void OnChanged(object source, FileSystemEventArgs e) {
            var text = await File.ReadAllTextAsync(e.FullPath, System.Text.Encoding.UTF8);
            code[e.FullPath] = text;
        }

        private void OnRenamed(object source, RenamedEventArgs e) {
            code[e.FullPath] = code[e.OldFullPath];
            code.Remove(e.OldFullPath);
        }
    }
}
