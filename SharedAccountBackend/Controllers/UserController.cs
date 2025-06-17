using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Data;
using SharedAccountBackend.Hubs;
using System.Security.Claims;
using SharedAccountBackend.Models;
using SharedAccountBackend.Dtos;
using SharedAccountBackend.Enums;
using SharedAccountBackend.Helpers;

namespace SharedAccountBackend.Controllers
{
    public class UserController : Controller
    {
        private readonly AppDbContext _db;

        public UserController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("admin/users")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetUsers()
        {
            var users = _db.Users
                .Select(u => new { u.Id, u.Username, u.Role })
                .ToList();
            return Ok(users);
        }

        [HttpDelete("{id}")]
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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserDto model)
        {
            if (_db.Users.Any(u => u.Username == model.Username))
            {
                return BadRequest("Username already exists");
            }

            await _db.Users.AddAsync(new User
            {
                Username = model.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(PasswordGenerator.GenerateStrongPassword(model.LengthPassword)),
                Role = Role.User
            });
            await _db.SaveChangesAsync();

            return Ok();
        }
    }
}
