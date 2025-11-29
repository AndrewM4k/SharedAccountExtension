using SharedAccountBackend.Dtos;
using SharedAccountBackend.Models;

namespace SharedAccountBackend.Repositories
{
    public interface ICopartActionRepository
    {
        Task<List<ActionResponseDto>> GetActionsAsync(string? actionType, string? search, string? userId, DateTime? startDate, DateTime? endDate, int page, int pageSize);
        Task<int> GetActionsCountAsync(string? actionType, string? search, string? userId, DateTime? startDate, DateTime? endDate);
        Task<List<CopartAction>> GetAllAsync();
        Task AddAsync(CopartAction action);
        Task<List<DateTime>> GetExistingActionTimestampsAsync(IEnumerable<DateTime> timestamps);
        Task SaveChangesAsync();
    }
}


