namespace SharedAccountBackend.Models
{
    public class CopartAction
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public DateTime ActionTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ActionType { get; set; } // "BID", "PURCHASE", etc.
        public string Details { get; set; } // JSON
        public string BidAmount { get; set; }
        public string UserBidAmount { get; set; }
        public string PageUrl { get; set; }
        public string LotNumber { get; set; }
        public string LotName { get; set; }
        public string Action { get; set; }
    }
}
