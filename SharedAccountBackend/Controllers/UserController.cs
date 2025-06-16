using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SharedAccountBackend.Data;
using SharedAccountBackend.Hubs;

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
    }
}
