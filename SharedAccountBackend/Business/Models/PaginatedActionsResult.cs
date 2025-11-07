using SharedAccountBackend.Models;

namespace SharedAccountBackend.Business.Models
{
    public class PaginatedActionsResult
    {
        public required IReadOnlyCollection<CopartAction> Data { get; init; }
        public int TotalCount { get; init; }
        public int Page { get; init; }
        public int PageSize { get; init; }
    }
}

