using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Data;
using SharedAccountBackend.Dtos;
using SharedAccountBackend.Enums;
using SharedAccountBackend.Models;
using System.Security.Claims;

namespace SharedAccountBackend.Controllers
{
    [ApiController]
    [Route("api/actions")]
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

        [HttpPost("add")]
        public async Task<IActionResult> ReceiveActions([FromBody] ActionDto action)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                await ProcessEvent(userId, action);
                //foreach (var eventDto in eventCollection.Actions)
                //{
                //    await ProcessEvent(userId, eventDto);
                //}

                await _context.SaveChangesAsync();

                // Удаление старья
                //await CleanOldEvents();

                return Ok(new { Success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing events");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        private async Task ProcessEvent(string userId, ActionDto eventDto)
        {
            switch ((ActionTypes)Enum.Parse(typeof(ActionTypes), eventDto.ActionType))
            {
                case (ActionTypes.Bid):
                    var bidEvent = new CopartAction()
                    {
                        UserId = userId,
                        ActionType = eventDto.ActionType,
                        LotNumber = eventDto.LotNumber,
                        LotName = eventDto.LotName,
                        Commentary = eventDto.Commentary,
                        UserBidAmount = eventDto.UserBidAmount,
                        PageUrl = eventDto.PageUrl,
                        ActionTime = TimeZoneInfo.ConvertTimeToUtc(DateTime.Parse(eventDto.Timestamp)),
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.CopartActions.AddAsync(bidEvent);
                    break;

                case ActionTypes.View:
                    var pageViewEvent = new PageViewAction
                    {
                        UserId = userId,
                        ActionType = eventDto.ActionType,
                        PageUrl = eventDto.PageUrl,
                        Timestamp = TimeZoneInfo.ConvertTimeToUtc(DateTime.Parse(eventDto.Timestamp)),
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

        [HttpPost("add-bulk")]
        public async Task<IActionResult> AddBulkActions([FromBody] ActionCollectionDto actionCollection)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            if (actionCollection == null || !actionCollection.Actions.Any())
            {
                return BadRequest("No actions provided.");
            }

            _logger.LogInformation("Received bulk action request with {Count} actions.", actionCollection.Actions.Count);

            try
            {
                // Проверяем, нет ли уже таких действий в БД (по timestamp и userId)
                var newActions = await FilterNewActions(actionCollection.Actions);

                if (newActions.Any())
                {
                    // Сохраняем только новые действия
                    foreach (var action in newActions)
                    {
                        // логика сохранения
                        await ProcessEvent(userId, action);
                    }

                    await _context.SaveChangesAsync();
                }

                // Возвращаем успешный результат с количеством обработанных действий
                return Ok(new
                {
                    success = true,
                    message = $"Processed {newActions.Count} new actions.",
                    processedCount = newActions.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing bulk actions");
                return StatusCode(500, "Internal server error");
            }
        }

        // Метод для фильтрации уже существующих действий
        private async Task<List<ActionDto>> FilterNewActions(List<ActionDto> actions)
        {
            // Реализуйте логику проверки, какие действия уже есть в БД
            // Например, по комбинации userId и timestamp
            var existingActions = await _context.CopartActions
                .Where(a => actions.Select(dto => TimeZoneInfo.ConvertTimeToUtc(DateTime.Parse(dto.Timestamp))).Contains(a.CreatedAt))
                .ToListAsync();
            //TimeZoneInfo.ConvertTimeToUtc(DateTime.Parse(
            return actions.Where(a => existingActions.All(e => e.CreatedAt != TimeZoneInfo.ConvertTimeToUtc(DateTime.Parse(a.Timestamp))))
                .ToList();
        }
    }
}
