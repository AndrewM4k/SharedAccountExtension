namespace SharedAccountBackend.Dtos
{
    public class ActionResponseDto
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public string? Username { get; set; }
        public DateTime ActionTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ActionType { get; set; }
        public string Commentary { get; set; }
        public string UserBidAmount { get; set; }
        public string PageUrl { get; set; }
        public string LotNumber { get; set; }
        public string LotName { get; set; }
        public string? Details { get; set; }
    }
}

