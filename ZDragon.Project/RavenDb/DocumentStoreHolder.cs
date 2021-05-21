using Raven.Client.Documents;
using System.Security.Cryptography.X509Certificates;

namespace ZDragon.Project.RavenDb {
    public class DocumentStoreHolder : IDocumentStoreHolder {
        public IDocumentStore Store { get; }

        public DocumentStoreHolder() {
            var raven = new DocumentStore {
                Urls = new[] { "https://a.free.tst-zdragon.ravendb.cloud/" },
                Database = "dev.zdragon",
                Certificate = new X509Certificate2("./free.tst-zdragon.client.certificate.pfx", "")
            };

            this.Store = raven.Initialize();
        }
    }

    public interface IDocumentStoreHolder {
        IDocumentStore Store { get; }
    }
}
