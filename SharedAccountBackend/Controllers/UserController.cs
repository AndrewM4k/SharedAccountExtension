using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SharedAccountBackend.Data;
using System.Security.Claims;
using SharedAccountBackend.Models;
using SharedAccountBackend.Dtos;
using SharedAccountBackend.Enums;

namespace SharedAccountBackend.Controllers
{
    public class UserController : Controller
    {
        private readonly AppDbContext _db;

        public UserController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("api/admin/users")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetUsers()
        {
            var users = _db.Users
                .Select(u => new { u.Id, u.Username, u.Role })
                .ToList();
            return Ok(users);
        }

        [HttpDelete("api/admin/users/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            // Запрещаем удаление текущего пользователя
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            if (id == currentUserId)
            {
                return BadRequest("You cannot delete yourself");
            }

            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("api/admin/users/register")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Register([FromBody] UserDto model)
        {
            if (_db.Users.Any(u => u.Username == model.Username))
            {
                return BadRequest("Username already exists");
            }

            await _db.Users.AddAsync(new User
            {
                Username = model.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                Role = Role.User
            });
            await _db.SaveChangesAsync();

            return Ok();
        }

        [HttpPut("api/admin/users/refresh-pass")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RefreshPassword([FromBody] AdminPasswordUpdateRequestDto model)
        {
            if (_db.Users.Any(u => u.Id == model.Id))
            {
                var user = _db.Users.First(u => u.Id == model.Id);
                if (model.Username != null)
                    if(user.Username != model.Username) user.Username = model.Username;
                else
                    return BadRequest("Username is empty");
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.NewPassword);
                await _db.SaveChangesAsync();
            }
            else
                return BadRequest("Username is not exists");

            return Ok();
        }

        [HttpGet("public/users")]
        public IActionResult GetUsersPublic()
        {
            var users = _db.Users
                .Select(u => new { u.Id, u.Username })
                .ToList();
            return Ok(users);
        }

        [HttpGet("check-tokens")]
        public IActionResult CheckTokens()
        {
            var accessToken = Request.Cookies["access_token"];
            var refreshToken = Request.Cookies["refresh_token"];

            return Ok(new
            {
                HasAccessToken = !string.IsNullOrEmpty(accessToken),
                HasRefreshToken = !string.IsNullOrEmpty(refreshToken),
                AccessTokenLength = accessToken?.Length ?? 0,
                RefreshTokenLength = refreshToken?.Length ?? 0
            });
        }
    }
}
