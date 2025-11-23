using SharedAccountBackend.Dtos;
using SharedAccountBackend.Models;

namespace SharedAccountBackend.Repositories
{
    public interface ICopartActionRepository
    {
        Task<List<CopartAction>> GetActionsAsync(string? actionType, string? search, int page, int pageSize);
        Task<int> GetActionsCountAsync(string? actionType, string? search);
        Task<List<CopartAction>> GetAllAsync();
        Task AddAsync(CopartAction action);
        Task<List<DateTime>> GetExistingActionTimestampsAsync(IEnumerable<DateTime> timestamps);
        Task SaveChangesAsync();
    }
}


