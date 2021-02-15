using System.Collections.Generic;
using System.IO;

namespace Woezel.Project.Components {
    public class DomainInteractor {
        public string RootPath { get; }
        public string DomainPath { get; }
        public string ApplicationsPath { get; }
        public string ModelsPath { get; }
        public List<ApplicationInteractor> Applications { get; }

        public DomainInteractor(string root, string name) {
            this.RootPath = root;
            this.DomainPath = Path.Combine(root, name);
            this.ApplicationsPath = Path.Combine(this.DomainPath, "Applications");
            this.ModelsPath = Path.Combine(this.DomainPath, "Models");

            if (!Directory.Exists(this.DomainPath)) Directory.CreateDirectory(this.DomainPath);
            if (!Directory.Exists(this.ApplicationsPath)) Directory.CreateDirectory(this.ApplicationsPath);
            if (!Directory.Exists(this.ModelsPath)) Directory.CreateDirectory(this.ModelsPath);

            this.Applications =  ApplicationInteractor.FromDirectory(this.ApplicationsPath);
        }

        public DomainInteractor CreateApplication(string name) {
            var appInteractor = ApplicationInteractor.Create(this.ApplicationsPath, name);
            this.Applications.Add(appInteractor);
            return this;
        }


        /// <summary>
        /// Not sure how to solve this...
        /// </summary>
        /// <param name="root"></param>
        /// <param name="name"></param>
        /// <returns></returns>
        public static DomainInteractor Create(string root, string name) {
            return new DomainInteractor(root, name);
        }
    }
}
