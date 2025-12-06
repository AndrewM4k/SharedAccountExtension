using SharedAccountBackend.Dtos;
using SharedAccountBackend.Models;

namespace SharedAccountBackend.Repositories
{
    public interface ICopartActionRepository
    {
        Task<List<ActionResponseDto>> GetActionsAsync(string? actionType, string? search, string? userId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string? lotNumber);
        Task<int> GetActionsCountAsync(string? actionType, string? search, string? userId, DateTime? startDate, DateTime? endDate, string? lotNumber);
        Task<List<CopartAction>> GetAllAsync();
        Task AddAsync(CopartAction action);
        Task<List<DateTime>> GetExistingActionTimestampsAsync(IEnumerable<DateTime> timestamps);
        Task<List<DateTime>> GetExistingActionTimestampsByUserAsync(string userId, IEnumerable<DateTime> timestamps);
        Task<HashSet<string>> GetExistingActionKeysAsync(string userId, IEnumerable<(DateTime timestamp, string lotNumber, string actionType)> actionKeys);
        Task SaveChangesAsync();
    }
}


