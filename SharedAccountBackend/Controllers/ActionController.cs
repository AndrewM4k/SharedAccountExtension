using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SharedAccountBackend.Business.Interfaces;
using SharedAccountBackend.Dtos;
using System.Security.Claims;

namespace SharedAccountBackend.Controllers
{
    [ApiController]
    [Route("api/actions")]
    [Authorize]
    public class ActionsController : ControllerBase
    {
        private readonly IActionService _actionService;
        private readonly ILogger<ActionsController> _logger;

        public ActionsController(IActionService actionService, ILogger<ActionsController> logger)
        {
            _logger = logger;
            _actionService = actionService;
        }
        
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetActions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? actionType = null,
            [FromQuery] string? search = null,
            [FromQuery] string? userId = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                // Normalize dates to UTC to match ActionTime storage
                // startDate should be at the start of the day in UTC
                DateTime? normalizedStartDate = null;
                if (startDate.HasValue)
                {
                    // Get just the date part and treat it as UTC midnight
                    var dateOnly = startDate.Value.Date;
                    normalizedStartDate = DateTime.SpecifyKind(dateOnly, DateTimeKind.Utc);
                }

                // endDate should be at the end of the day in UTC (inclusive)
                DateTime? normalizedEndDate = null;
                if (endDate.HasValue)
                {
                    // Get the date part, add one day (to make it exclusive for < comparison)
                    // This makes the end date inclusive (all actions on that day)
                    var dateOnly = endDate.Value.Date.AddDays(1);
                    normalizedEndDate = DateTime.SpecifyKind(dateOnly, DateTimeKind.Utc);
                }

                var result = await _actionService.GetActionsAsync(page, pageSize, actionType, search, userId, normalizedStartDate, normalizedEndDate);

                return Ok(new
                {
                    result.Data,
                    result.TotalCount,
                    result.Page,
                    result.PageSize
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting actions");
                return StatusCode(500, "Internal server error");
            }
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

                await _actionService.ProcessActionAsync(userId, action);
                return Ok(new { Success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing events");
                return StatusCode(500, new { Success = false, Message = ex.Message });
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
                var processedCount = await _actionService.ProcessBulkActionsAsync(userId, actionCollection.Actions);

                return Ok(new
                {
                    success = true,
                    message = $"Processed {processedCount} new actions.",
                    processedCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing bulk actions");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
