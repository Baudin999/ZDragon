using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ZDragon.Project {


    public class DbUser : IEntity {
        public DbUser() { }

        public string Id { get; set; } = default!;
        public string UserName { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string Password { get; set; } = default!;
        public bool IsActive { get; set; } = default!;
        public DbProfile Profile { get; set; } = default!;

        public Profile ToProfile() {
            return new Profile {
                AvatarUrl = Profile.AvatarUrl,
                Email = Email,
                UserName = UserName
            };
        }
    }

    public class DbProfile {
        public DbProfile() { }

        public string? AvatarUrl { get; set; } = default!;
        public string? LastProjectId { get; set; } = default!;
        public string? LastProjectName { get; set; } = default!;
        public List<string> Favorites { get; set; } = default!;
    }

    public class Profile {
        [Required(ErrorMessage = "UserName is required")]
        public string UserName { get; set; } = default!;

        [Required(ErrorMessage = "Email is required")]
        public string Email { get; set; } = default!;

        public string? AvatarUrl { get; set; } = default!;
        public string? LastProjectId { get; internal set; } = default!;
        public string? LastProjectName { get; internal set; } = default!;

        public Profile() { }

        public Profile(string userName, string email, string? avatarUrl) {
            this.UserName = userName;
            this.Email = email;
            this.AvatarUrl = avatarUrl;
        }
    }

    public class CreateAccount {
        [Required(ErrorMessage = "Username is required.")]
        [MinLength(3, ErrorMessage = "Username should be at least three characters long.")]
        [MaxLength(25, ErrorMessage = "Username should not be longer than 25 characters.")]
        public string UserName { get; set; } = default!;

        [Required(ErrorMessage = "Email address is requried.")]
        [EmailAddress(ErrorMessage = "A user should have a valid email address.")]
        public string Email { get; set; } = default!;

        [Required(ErrorMessage = "Password is required.")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = default!;

        [Url(ErrorMessage = "Avatar Url should be a valid URL.")]
        public string? AvatarUrl { get; set; }
    }

    public class LoginModel {

        [EmailAddress(ErrorMessage = "A user should have a valid username or email address.")]
        [Required(ErrorMessage = "UserName or Email address is requried.")]
        public string UserName { get; set; } = default!;
        [DataType(DataType.Password)]
        [Required(ErrorMessage = "Password is required.")]
        public string Password { get; set; } = default!;
    }

    public interface IEntity {
        string Id { get; set; }
    }
}
