using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Data;
using SharedAccountBackend.Dtos;
using SharedAccountBackend.Models;
using System.Security.Claims;
using System.Text.Json;

namespace SharedAccountBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ActionController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ActionController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("record")]
        public async Task<IActionResult> RecordAction([FromBody] ActionDto action)
        {
            var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (value != null)
            {
                var newAction = new CopartAction
                {
                    UserId = int.Parse(value),
                    ActionTime = DateTime.UtcNow,
                    ActionType = action.ActionType,
                    LotNumber = action.LotNumber,
                    Details = JsonSerializer.Serialize(action.Details)
                };

                _context.CopartActions.Add(newAction);
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetActions()
        {
            var actions = await _context.CopartActions
                .OrderByDescending(a => a.ActionTime)
                .ToListAsync();

            return Ok(actions);
        }
    }
}
