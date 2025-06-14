using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SharedAccountBackend.Data;
using SharedAccountBackend.Hubs;
using SharedAccountBackend.Models;
using System.Security.Claims;

namespace SharedAccountBackend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/log")]
    public class LogController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<LogHub> _hub;

        public LogController(AppDbContext db, IHubContext<LogHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        [HttpPost("action")]
        public async Task<IActionResult> LogAction([FromBody] LogActionRequest request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var action = new UserAction { UserId = userId, Action = request.Action, Timestamp = DateTime.UtcNow };

            _db.UserActions.Add(action);
            await _db.SaveChangesAsync();

            // Отправляем уведомление админам через SignalR
            await _hub.Clients.Group("Admins").SendAsync("NewAction", action);
            return Ok();
        }

        [HttpGet("actions")]
        public IActionResult GetActions()
        {
            var actions = _db.UserActions.OrderByDescending(a => a.Timestamp).ToList();
            return Ok(actions);
        }
    }
}
