using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Data;
using SharedAccountBackend.Dtos;
using SharedAccountBackend.Models;
using System.Security.Claims;

namespace SharedAccountBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ActionsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ActionsController> _logger;

        public ActionsController(AppDbContext context, ILogger<ActionsController> logger)
        {
            _logger = logger;
            _context = context;
        }

        //[HttpPost("record")]
        //public async Task<IActionResult> RecordAction([FromBody] ActionDto action)
        //{
        //    try
        //    {
        //        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //        if (string.IsNullOrEmpty(userId))
        //        {
        //            return Unauthorized();
        //        }

        //        if (userId != null)
        //        {
        //            var newAction = new CopartAction
        //            {
        //                UserId = userId,
        //                ActionTime = DateTime.UtcNow,
        //                ActionType = action.ActionType,
        //                BidAmount = action.BidAmount,
        //                LotNumber = action.LotNumber,
        //                Details = JsonSerializer.Serialize(action.Details),
        //                CreatedAt = DateTime.UtcNow
        //            };

        //            _context.CopartActions.Add(newAction);
        //        }

        //        await _context.SaveChangesAsync();
        //        return Ok(new { Success = true });
        //    }
        //    catch (Exception ex)
        //    {
        //        _logger.LogError(ex, "Ошибка при записи события ставки");
        //        return StatusCode(500, new { Success = false, Message = ex.Message });
        //    }
        //}

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetActions()
        {
            var actions = await _context.CopartActions
                .OrderByDescending(a => a.ActionTime)
                .ToListAsync();

            return Ok(actions);
        }

        [HttpPost]
        public async Task<IActionResult> ReceiveActions([FromBody] ActionCollectionDto eventCollection)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                foreach (var eventDto in eventCollection.Actions)
                {
                    await ProcessEvent(userId, eventDto);
                }

                await _context.SaveChangesAsync();

                // Удаление старья
                //await CleanOldEvents();

                return Ok(new { Success = true, Received = eventCollection.Actions.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing events");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        private async Task ProcessEvent(string userId, ActionDto eventDto)
        {
            switch (eventDto.ActionType)
            {
                case "BID_ACTION":
                    var bidEvent = new CopartAction()
                    {
                        UserId = userId,
                        ActionType = eventDto.ActionType,
                        Action = eventDto.Action,
                        LotNumber = eventDto.LotNumber,
                        LotName = eventDto.LotName,
                        BidAmount = eventDto.BidAmount,
                        UserBidAmount = eventDto.UserBidAmount,
                        PageUrl = eventDto.PageUrl,
                        ActionTime = DateTime.Parse(eventDto.Timestamp),
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.CopartActions.AddAsync(bidEvent);
                    break;

                case "PAGE_VIEW":
                    var pageViewEvent = new PageViewAction
                    {
                        UserId = userId,
                        ActionType = eventDto.ActionType,
                        PageUrl = eventDto.PageUrl,
                        PageTitle = eventDto.PageTitle,
                        Referrer = eventDto.Referrer,
                        Timestamp = DateTime.Parse(eventDto.Timestamp),
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.PageViewActions.AddAsync(pageViewEvent);
                    break;

                default:
                    _logger.LogWarning($"Unknown event type: {eventDto.ActionType}");
                    break;

            }
        }

        private async Task CleanOldEvents()
        {
            try
            {
                // Удаляем события старше 30 дней
                var cutoffDate = DateTime.UtcNow.AddDays(-30);

                var oldBidEvents = _context.CopartActions.Where(e => e.CreatedAt < cutoffDate);
                var oldPageViewEvents = _context.PageViewActions.Where(e => e.CreatedAt < cutoffDate);

                _context.CopartActions.RemoveRange(oldBidEvents);
                _context.PageViewActions.RemoveRange(oldPageViewEvents);

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Cleaned up old events before {cutoffDate}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning old events");
            }
        }
    }
}
