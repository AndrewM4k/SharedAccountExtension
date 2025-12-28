using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Data;
using SharedAccountBackend.Dtos;
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

        public async Task<List<ActionResponseDto>> GetActionsAsync(string? actionType, string? search, string? userId, DateTime? startDate, DateTime? endDate, int page, int pageSize, string? lotNumber)
        {
            var query = _context.CopartActions.AsQueryable();

            if (!string.IsNullOrWhiteSpace(actionType))
            {
                // Case-insensitive comparison
                query = query.Where(a => a.ActionType.ToLower() == actionType.ToLower());
            }

            if (!string.IsNullOrWhiteSpace(userId))
            {
                query = query.Where(a => a.UserId == userId);
            }

            if (startDate.HasValue)
            {
                // startDate is already normalized to UTC at start of day
                query = query.Where(a => a.ActionTime >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                // endDate is already normalized to UTC at start of next day (inclusive)
                query = query.Where(a => a.ActionTime < endDate.Value);
            }

            if (!string.IsNullOrWhiteSpace(lotNumber))
            {
                // Filter by LotNumber field (case-insensitive contains)
                query = query.Where(a => a.LotNumber != null && a.LotNumber.ToLower().Contains(lotNumber.ToLower()));
            }

            // Get users for username lookup (always needed for username in response)
            var users = await _context.Users.ToListAsync();
            var userLookup = users.ToDictionary(u => u.Id.ToString(), u => u.Username);

            // Default: sort by ActionTime descending
            query = query.OrderByDescending(a => a.ActionTime);

            // If search is provided, we need to filter in memory (to include username search)
            // So we get all matching actions first, then filter and paginate
            if (!string.IsNullOrWhiteSpace(search))
            {
                // Get all actions matching the filters (actionType, userId, dates, lotNumber) but not search yet
                var allActions = await query.ToListAsync();

                // Map to DTOs and add usernames, then filter by search term (including username)
                var searchLower = search.ToLower();
                var allResults = allActions.Select(action => new ActionResponseDto
                {
                    Id = action.Id,
                    UserId = action.UserId,
                    Username = userLookup.TryGetValue(action.UserId, out var username) ? username : null,
                    ActionTime = action.ActionTime,
                    CreatedAt = action.CreatedAt,
                    ActionType = action.ActionType,
                    Commentary = action.Commentary,
                    UserBidAmount = action.UserBidAmount,
                    PageUrl = action.PageUrl,
                    LotNumber = action.LotNumber,
                    LotName = action.LotName,
                    Details = action.Details
                }).Where(a =>
                    (a.Username != null && a.Username.ToLower().Contains(searchLower)) ||
                    (a.LotNumber != null && a.LotNumber.ToLower().Contains(searchLower)) ||
                    (a.Commentary != null && a.Commentary.ToLower().Contains(searchLower)) ||
                    (a.ActionType != null && a.ActionType.ToLower().Contains(searchLower)) ||
                    (a.Details != null && a.Details.ToLower().Contains(searchLower))
                ).OrderByDescending(a => a.ActionTime).ToList();

                // Apply pagination after filtering
                return allResults
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();
            }
            else
            {
                // No search, so we can paginate directly in the database
                var actions = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                // Map to DTOs and add usernames
                return actions.Select(action => new ActionResponseDto
                {
                    Id = action.Id,
                    UserId = action.UserId,
                    Username = userLookup.TryGetValue(action.UserId, out var username) ? username : null,
                    ActionTime = action.ActionTime,
                    CreatedAt = action.CreatedAt,
                    ActionType = action.ActionType,
                    Commentary = action.Commentary,
                    UserBidAmount = action.UserBidAmount,
                    PageUrl = action.PageUrl,
                    LotNumber = action.LotNumber,
                    LotName = action.LotName,
                    Details = action.Details
                }).ToList();
            }
        }

        public async Task<int> GetActionsCountAsync(string? actionType, string? search, string? userId, DateTime? startDate, DateTime? endDate, string? lotNumber)
        {
            var query = _context.CopartActions.AsQueryable();

            if (!string.IsNullOrWhiteSpace(actionType))
            {
                // Case-insensitive comparison
                query = query.Where(a => a.ActionType.ToLower() == actionType.ToLower());
            }

            if (!string.IsNullOrWhiteSpace(userId))
            {
                query = query.Where(a => a.UserId == userId);
            }

            if (startDate.HasValue)
            {
                // startDate is already normalized to UTC at start of day
                query = query.Where(a => a.ActionTime >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                // endDate is already normalized to UTC at start of next day (inclusive)
                query = query.Where(a => a.ActionTime < endDate.Value);
            }

            if (!string.IsNullOrWhiteSpace(lotNumber))
            {
                // Filter by LotNumber field (case-insensitive contains)
                query = query.Where(a => a.LotNumber != null && a.LotNumber.ToLower().Contains(lotNumber.ToLower()));
            }

            // If search includes username, we need to check it after materializing
            // If search is provided, we need to filter in memory to include username search
            if (!string.IsNullOrWhiteSpace(search))
            {
                // Get all actions matching the filters (actionType, userId, dates) but not search yet
                var allActions = await query.ToListAsync();

                // Get users for username lookup
                var users = await _context.Users.ToListAsync();
                var userLookup = users.ToDictionary(u => u.Id.ToString(), u => u.Username);

                // Filter by search term (including username) in memory
                var searchLower = search.ToLower();
                var filteredResults = allActions.Where(a =>
                {
                    var username = userLookup.TryGetValue(a.UserId, out var un) ? un : null;
                    return (username != null && username.ToLower().Contains(searchLower)) ||
                           (a.LotNumber != null && a.LotNumber.ToLower().Contains(searchLower)) ||
                           (a.Commentary != null && a.Commentary.ToLower().Contains(searchLower)) ||
                           (a.ActionType != null && a.ActionType.ToLower().Contains(searchLower)) ||
                           (a.Details != null && a.Details.ToLower().Contains(searchLower));
                }).ToList();

                return filteredResults.Count;
            }

            return await query.CountAsync();
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

        public async Task<List<DateTime>> GetExistingActionTimestampsByUserAsync(string userId, IEnumerable<DateTime> timestamps)
        {
            var timestampList = timestamps.ToList();

            if (timestampList.Count == 0)
            {
                return [];
            }

            return await _context.CopartActions
                .Where(a => a.UserId == userId && timestampList.Contains(a.ActionTime))
                .Select(a => a.ActionTime)
                .ToListAsync();
        }

        public async Task<HashSet<string>> GetExistingActionKeysAsync(string userId, IEnumerable<(DateTime timestamp, string lotNumber, string actionType)> actionKeys)
        {
            var actionKeysList = actionKeys.ToList();

            if (actionKeysList.Count == 0)
            {
                return new HashSet<string>();
            }

            var timestamps = actionKeysList.Select(k => k.timestamp).Distinct().ToList();
            var existingActions = await _context.CopartActions
                .Where(a => a.UserId == userId && timestamps.Contains(a.ActionTime))
                .Select(a => new { a.ActionTime, a.LotNumber, a.ActionType })
                .ToListAsync();

            var existingKeys = new HashSet<string>();
            foreach (var existing in existingActions)
            {
                var key = $"{existing.ActionTime:O}_{existing.LotNumber ?? string.Empty}_{existing.ActionType}";
                existingKeys.Add(key);
            }

            return existingKeys;
        }

        public Task SaveChangesAsync()
        {
            return _context.SaveChangesAsync();
        }
    }
}
