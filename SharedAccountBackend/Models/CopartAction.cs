namespace SharedAccountBackend.Models
{
    public class CopartAction
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public DateTime ActionTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ActionType { get; set; } // "BID", "PURCHASE", etc.
        public string Commentary { get; set; } // JSON
        public string UserBidAmount { get; set; }
        public string PageUrl { get; set; }
        public string LotNumber { get; set; }
        public string LotName { get; set; }
    }
}
