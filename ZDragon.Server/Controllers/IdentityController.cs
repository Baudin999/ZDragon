using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ZDragon.Project;
using ZDragon.Project.Services;
using ZDragon.Server.Models;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace ZDragon.Server.Controllers {

    [ApiController]
    public class IdentityController : ControllerBase {
        private readonly IdentityService _identityService;

        public IdentityController(IdentityService identityService) {
            this._identityService = identityService;
        }

        [HttpPost("/api/login")]
        public async Task<IActionResult> Login([FromBody] LoginModel loginModel) {
            try {
                if (ModelState.IsValid) {
                    var profile = _identityService.ValidateUser(loginModel.UserName, loginModel.Password);
                    if (profile is null) return Unauthorized(new UnauthorizedError());

                    var userPrincipal = CreateUserPrincipal(profile);
                    await HttpContext.SignInAsync(userPrincipal);
                    return Ok(new Success<Profile>(profile));
                }
                else {
                    return BadRequest(new ValidationError(ModelState));
                }
            }
            catch (UnauthorizedAccessException) {
                return Unauthorized();
            }
            catch (Exception) {
                return BadRequest();
            }
        }

        [Authorize]
        [HttpPost("/api/logout")]
        public async Task<IActionResult> Logout() {
            await HttpContext.SignOutAsync("CookieAuth");
            return Ok();
        }

        [HttpPost("/api/create-account")]
        public async Task<IActionResult> CreateAccount([FromBody] CreateAccount createAccount) {
            try {
                if (ModelState.IsValid) {
                    var profile = _identityService.CreateIdentity(createAccount);
                    await HttpContext.SignOutAsync("CookieAuth");
                    if (profile != null) {
                        var userPrincipal = CreateUserPrincipal(profile);
                        await HttpContext.SignInAsync(userPrincipal);
                        return Ok(new Success<Profile>(profile));
                    }
                    else {
                        return BadRequest("Could not create the profile");
                    }
                }
                else {
                    return BadRequest(new ValidationError(ModelState));
                }
            }
            catch (Exception ex) {
                return BadRequest(new Error(ex.Message));
            }
        }

        [HttpGet("api/username/{username}")]
        public IActionResult ValidateUserName([FromRoute] string username) {
            try {

                var test = new Regex("[a-zA-Z][a-zA-Z0-9]*");
                if (!test.IsMatch(username)) {
                    return Ok(new {
                        Valid = false,
                        Message = "Usernames must start with a letter and can only contain letters and numbers."
                    });
                }
                if (username != null && username.Length > 2 && username.Length < 26) {
                    var usernameTaken = _identityService.UserNameAlreadyTaken(username);
                    return Ok(new {
                        Valid = !usernameTaken,
                        Message = !usernameTaken ?
                            $"'{username}' is still available." :
                            $"'{username}' is already taken"
                    });
                }
                else {
                    return Ok(new {
                        Valid = false,
                        Message =
                            username == null ? "Username is not valid" :
                            username.Length < 3 ? "Your username should be at least 2 characters long" :
                            username.Length > 25 ? "Your username should not be longer than 25 characters." :
                            "Username is not valid"
                    });
                }
            }
            catch (Exception) { }
            return Ok(new {
                Valid = false,
                Message = "Username is not valid"
            });
        }

        private ClaimsPrincipal CreateUserPrincipal(Profile profile) {
            var claims = new List<Claim> {
                        new Claim("uid", profile.Email.ToString()),
                        new Claim("email", profile.Email.ToString()),
                        new Claim(ClaimTypes.Sid, profile.Email.ToString()),
                        new Claim(ClaimTypes.Email, profile.Email),
                        new Claim(ClaimTypes.Role, "User"),
                    };

            var zdragonIdentity = new ClaimsIdentity(claims, "ZDragon.Identity");
            return new ClaimsPrincipal(new[] { zdragonIdentity });

        }
    }
}
