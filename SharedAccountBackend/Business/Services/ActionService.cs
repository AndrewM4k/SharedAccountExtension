using SharedAccountBackend.Business.Interfaces;
using SharedAccountBackend.Business.Models;
using SharedAccountBackend.Dtos;
using SharedAccountBackend.Enums;
using SharedAccountBackend.Models;
using SharedAccountBackend.Repositories;

namespace SharedAccountBackend.Business.Services
{
    public class ActionService : IActionService
    {
        private readonly ICopartActionRepository _copartActionRepository;
        private readonly IPageViewActionRepository _pageViewActionRepository;
        private readonly ILogger<ActionService> _logger;

        public ActionService(
            ICopartActionRepository copartActionRepository,
            IPageViewActionRepository pageViewActionRepository,
            ILogger<ActionService> logger)
        {
            _copartActionRepository = copartActionRepository;
            _pageViewActionRepository = pageViewActionRepository;
            _logger = logger;
        }

        public async Task<PaginatedActionsResult> GetActionsAsync(int page, int pageSize, string? actionType, string? search, string? userId, DateTime? startDate, DateTime? endDate, string? lotNumber)
        {
            var actions = await _copartActionRepository.GetActionsAsync(actionType, search, userId, startDate, endDate, page, pageSize, lotNumber);
            var totalCount = await _copartActionRepository.GetActionsCountAsync(actionType, search, userId, startDate, endDate, lotNumber);

            return new PaginatedActionsResult
            {
                Data = actions,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<IReadOnlyCollection<CopartAction>> GetAllAsync()
        {
            return await _copartActionRepository.GetAllAsync();
        }

        public async Task ProcessActionAsync(string userId, ActionDto actionDto)
        {
            var actionType = await ProcessActionInternalAsync(userId, actionDto);

            if (actionType is null)
            {
                return;
            }

            switch (actionType)
            {
                case ActionTypes.Bid:
                    await _copartActionRepository.SaveChangesAsync();
                    break;
                case ActionTypes.View:
                    await _pageViewActionRepository.SaveChangesAsync();
                    break;
            }
        }

        public async Task<int> ProcessBulkActionsAsync(string userId, IReadOnlyCollection<ActionDto> actions)
        {
            if (actions is null || actions.Count == 0)
            {
                return 0;
            }

            // Create action keys for comprehensive duplicate detection: userId + timestamp + lotNumber + actionType
            var actionKeys = actions
                .Select(a => (
                    timestamp: ParseToUtc(a.Timestamp),
                    lotNumber: a.LotNumber ?? string.Empty,
                    actionType: a.ActionType ?? string.Empty
                ))
                .ToList();

            // Check for duplicates using comprehensive key (userId + timestamp + lotNumber + actionType)
            var existingKeys = await _copartActionRepository.GetExistingActionKeysAsync(userId, actionKeys);

            var newActions = actions
                .Where(a =>
                {
                    var timestamp = ParseToUtc(a.Timestamp);
                    var key = $"{timestamp:O}_{a.LotNumber ?? string.Empty}_{a.ActionType ?? string.Empty}";
                    return !existingKeys.Contains(key);
                })
                .ToList();

            var shouldSaveCopartActions = false;
            var shouldSavePageViewActions = false;

            foreach (var action in newActions)
            {
                var processedType = await ProcessActionInternalAsync(userId, action);

                switch (processedType)
                {
                    case ActionTypes.Bid:
                        shouldSaveCopartActions = true;
                        break;
                    case ActionTypes.View:
                        shouldSaveCopartActions = true;
                        //shouldSavePageViewActions = true;
                        break;
                }
            }

            if (shouldSaveCopartActions)
            {
                await _copartActionRepository.SaveChangesAsync();
            }

            if (shouldSavePageViewActions)
            {
                await _pageViewActionRepository.SaveChangesAsync();
            }

            return newActions.Count;
        }

        private static DateTime ParseToUtc(string timestamp)
        {
            if (DateTime.TryParse(timestamp, out var parsed))
            {
                return TimeZoneInfo.ConvertTimeToUtc(parsed);
            }

            return DateTime.UtcNow;
        }

        private async Task<ActionTypes?> ProcessActionInternalAsync(string userId, ActionDto actionDto)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new ArgumentException("User id is required", nameof(userId));
            }

            if (!Enum.TryParse<ActionTypes>(actionDto.ActionType, true, out var actionType))
            {
                _logger.LogWarning("Unknown event type {ActionType}", actionDto.ActionType);
                return null;
            }

            var timestamp = ParseToUtc(actionDto.Timestamp);

            switch (actionType)
            {
                case ActionTypes.Bid:
                    await _copartActionRepository.AddAsync(new CopartAction
                    {
                        UserId = userId,
                        ActionType = actionDto.ActionType,
                        LotNumber = actionDto.LotNumber,
                        LotName = actionDto.LotName,
                        Commentary = actionDto.Commentary,
                        UserBidAmount = actionDto.UserBidAmount,
                        PageUrl = actionDto.PageUrl,
                        Details = actionDto.Details,
                        ActionTime = timestamp,
                        CreatedAt = DateTime.UtcNow
                    });
                    break;

                case ActionTypes.View:
                    await _copartActionRepository.AddAsync(new CopartAction
                    {
                        UserId = userId,
                        ActionType = actionDto.ActionType,
                        LotNumber = actionDto.LotNumber,
                        LotName = actionDto.LotName,
                        Commentary = actionDto.Commentary,
                        UserBidAmount = actionDto.UserBidAmount,
                        PageUrl = actionDto.PageUrl,
                        Details = actionDto.Details,
                        ActionTime = timestamp,
                        CreatedAt = DateTime.UtcNow
                    });
                    //await _pageViewActionRepository.AddAsync(new PageViewAction
                    //{
                    //    UserId = userId,
                    //    ActionType = actionDto.ActionType,
                    //    PageUrl = actionDto.PageUrl,
                    //    Timestamp = timestamp,
                    //    CreatedAt = DateTime.UtcNow
                    //});
                    break;

                default:
                    _logger.LogWarning("Unhandled event type {ActionType}", actionType);
                    return null;
            }

            return actionType;
        }
    }
}

