using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Data;
using SharedAccountBackend.Models;

namespace SharedAccountBackend.Repositories
{
    public class CopartActionRepository : ICopartActionRepository
    {
        private readonly AppDbContext _context;

        public CopartActionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<CopartAction>> GetActionsAsync(string? actionType, string? search, int page, int pageSize)
        {
            var query = _context.CopartActions.AsQueryable();

            if (!string.IsNullOrWhiteSpace(actionType))
            {
                query = query.Where(a => a.ActionType == actionType);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(a =>
                    (a.LotNumber != null && a.LotNumber.Contains(search)) ||
                    (a.Commentary != null && a.Commentary.Contains(search)));
            }

            return await query
                .OrderByDescending(a => a.ActionTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public Task<int> GetActionsCountAsync(string? actionType, string? search)
        {
            var query = _context.CopartActions.AsQueryable();

            if (!string.IsNullOrWhiteSpace(actionType))
            {
                query = query.Where(a => a.ActionType == actionType);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(a =>
                    (a.LotNumber != null && a.LotNumber.Contains(search)) ||
                    (a.Commentary != null && a.Commentary.Contains(search)));
            }

            return query.CountAsync();
        }

        public Task<List<CopartAction>> GetAllAsync()
        {
            return _context.CopartActions
                .OrderByDescending(a => a.ActionTime)
                .ToListAsync();
        }

        public Task AddAsync(CopartAction action)
        {
            return _context.CopartActions.AddAsync(action).AsTask();
        }

        public async Task<List<DateTime>> GetExistingActionTimestampsAsync(IEnumerable<DateTime> timestamps)
        {
            var timestampList = timestamps.ToList();

            if (timestampList.Count == 0)
            {
                return [];
            }

            return await _context.CopartActions
                .Where(a => timestampList.Contains(a.ActionTime))
                .Select(a => a.ActionTime)
                .ToListAsync();
        }

        public Task SaveChangesAsync()
        {
            return _context.SaveChangesAsync();
        }
    }
}

