using SharedAccountBackend.Dtos;
using SharedAccountBackend.Models;

namespace SharedAccountBackend.Business.Models
{
    public class PaginatedActionsResult
    {
        public required IReadOnlyCollection<object> Data { get; init; }
        public int TotalCount { get; init; }
        public int Page { get; init; }
        public int PageSize { get; init; }
    }
}


