using Raven.Client.Documents;
using System;
using System.Linq;
using ZDragon.Project.RavenDb;

namespace ZDragon.Project.Services {
    public class IdentityService {

        private readonly IDocumentStore _store;

        public IdentityService(IDocumentStoreHolder dsHolder) {
            _store = dsHolder.Store;
        }

        public Profile CreateIdentity(CreateAccount createAccount) {
            using var session = _store.OpenSession();

            // check if the user already exists
            var oldUser = session
                .Query<DbUser>()
                .Where(u => u.Email == createAccount.Email || u.UserName == createAccount.UserName)
                .FirstOrDefault();

            if (oldUser != null) throw new Exception("A user with this email already exists.");

            // let's revamp the password...
            var password = PasswordService.HashPassword(createAccount.Password);
            var user = new DbUser {
                UserName = createAccount.UserName,
                Email = createAccount.Email,
                Password = password,
                IsActive = true,
                Profile = new DbProfile {
                    AvatarUrl = "/standalone-icon.png"
                }
            };
            session.Store(user, $"users/");
            session.SaveChanges();

            return user.ToProfile();
        }

        public Profile? ValidateUser(string userName, string password) {
            try {

                // Get the user from the database
                using var session = _store.OpenSession();
                DbUser? dbUser;

                if (userName.Contains('@')) {
                    dbUser =
                        session
                            .Query<DbUser>()
                            .Where(u => u.Email == userName)
                            .FirstOrDefault();
                }
                else {
                    dbUser =
                        session
                            .Query<DbUser>()
                            .Where(u => u.UserName == userName)
                            .FirstOrDefault();
                }

                var isAuthenticated = dbUser is null ? false : PasswordService.VerifyPasswordHash(dbUser.Password, password);
                if (isAuthenticated && dbUser is not null) {
                    return dbUser.ToProfile();
                }
                throw new UnauthorizedAccessException();
            }
            catch (UnauthorizedAccessException ex) {
                Console.WriteLine(ex.Message);
                throw;
            }
            catch (Exception) {
                return null;
            }
        }

        public bool UserNameAlreadyTaken(string username) {
            using var session = _store.OpenSession();
            var dbUser =
                    session
                        .Query<DbUser>()
                        .Where(u => u.UserName == username)
                        .FirstOrDefault();
            return dbUser != null;
        }





    }
}
