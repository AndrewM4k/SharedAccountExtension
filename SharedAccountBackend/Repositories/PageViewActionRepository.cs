using SharedAccountBackend.Data;
using SharedAccountBackend.Models;

namespace SharedAccountBackend.Repositories
{
    public class PageViewActionRepository : IPageViewActionRepository
    {
        private readonly AppDbContext _context;

        public PageViewActionRepository(AppDbContext context)
        {
            _context = context;
        }

        public Task AddAsync(PageViewAction action)
        {
            return _context.PageViewActions.AddAsync(action).AsTask();
        }

        public Task SaveChangesAsync()
        {
            return _context.SaveChangesAsync();
        }
    }
}

