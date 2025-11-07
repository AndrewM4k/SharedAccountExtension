using SharedAccountBackend.Models;

namespace SharedAccountBackend.Repositories
{
    public interface IPageViewActionRepository
    {
        Task AddAsync(PageViewAction action);
        Task SaveChangesAsync();
    }
}

