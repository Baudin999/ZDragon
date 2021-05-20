//using System;
//using System.IO;
//using System.Threading.Tasks;
//using ZDragon.Project.Interactors;

//namespace ZDragon.Project {
//    public class FileWatcher : IDisposable {
//        private readonly FileSystemWatcher watcher;


//        public FileWatcher(string dir) {
//            //watcher = new FileSystemWatcher {
//            //    Path = dir,
//            //    IncludeSubdirectories = true,
//            //    EnableRaisingEvents = true
//            //};

//            // Watch for changes in LastAccess and LastWrite times, and
//            // the renaming of files or directories.
//            //watcher.NotifyFilter = NotifyFilters.LastAccess
//            //                     | NotifyFilters.LastWrite
//            //                     | NotifyFilters.FileName
//            //                     | NotifyFilters.DirectoryName;


//            // Add event handlers.
//            //watcher.Changed += TextChanged;

//            //watcher.Created += OnChanged;
//            //watcher.Deleted += OnChanged;
//            //watcher.Renamed += OnRenamed;
//        }

//        public void Dispose() {
//            watcher?.Dispose();
//        }

//        private void TextChanged(object source, FileSystemEventArgs e) {

//            // TODO: FIX THIS, FILES ARE LOCKED AND CODE DOES NOT WORK!

//            //if (Project.CurrentProject is null) return;

//            //// the actual content has changed and now we will
//            //// render the document again...
//            //if (e.ChangeType == WatcherChangeTypes.Changed) {
                
//            //    var ns = Utilities.GetNamespaceFromPath(Project.CurrentProject.RootPath, e.FullPath);
//            //    var moduleInteractor = Project.CurrentProject.FindInteractorByNamespace<IModuleInteractor>(ns);
//            //    if (moduleInteractor is not null) {
//            //        var text = await moduleInteractor.GetText();
//            //        _ = moduleInteractor.SaveModule(text);
//            //    }
//            //}
//        }

//        // Define the event handlers.
//        private void OnChanged(object source, FileSystemEventArgs e) {
//            UpdateProjectStructure();
//        }

//        private void OnRenamed(object source, RenamedEventArgs e) {
//            UpdateProjectStructure();
//        }

//        private async void UpdateProjectStructure() {
//            Project.CurrentProject?.ResetDirectory();
//            await Task.Delay(1000);
//            Project.CurrentProject?.SendMessage("UpdateProjectStructure");
//        }
//    }
//}
