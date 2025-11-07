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
        public async Task<IActionResult> GetActions()
        {
            var actions = await _actionService.GetAllAsync();

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
