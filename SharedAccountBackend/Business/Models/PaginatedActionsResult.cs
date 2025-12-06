using SharedAccountBackend.Dtos;

namespace SharedAccountBackend.Business.Models
{
    public class PaginatedActionsResult
    {
        public required IReadOnlyCollection<ActionResponseDto> Data { get; init; }
        public int TotalCount { get; init; }
        public int Page { get; init; }
        public int PageSize { get; init; }
    }
}


