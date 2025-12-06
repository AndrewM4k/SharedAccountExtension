using SharedAccountBackend.Business.Models;
using SharedAccountBackend.Dtos;

namespace SharedAccountBackend.Business.Interfaces
{
    public interface IActionService
    {
        Task<PaginatedActionsResult> GetActionsAsync(int page, int pageSize, string? actionType, string? search, string? userId, DateTime? startDate, DateTime? endDate, string? lotNumber);
        Task<IReadOnlyCollection<SharedAccountBackend.Models.CopartAction>> GetAllAsync();
        Task ProcessActionAsync(string userId, ActionDto actionDto);
        Task<int> ProcessBulkActionsAsync(string userId, IReadOnlyCollection<ActionDto> actions);
    }
}


