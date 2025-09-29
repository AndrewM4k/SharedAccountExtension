namespace SharedAccountBackend.Dtos
{
    public class ActionDto
    {
        public string ActionType { get; set; } // "BID", "PURCHASE", etc.
        public string LotNumber { get; set; }
        public string Commentary { get; set; } // JSON
        public string Timestamp { get; set; }
        public string Url { get; set; }
        public string LotName { get; set; }
        public string UserBidAmount { get; set; }
        public string PageUrl { get; set; }
    }
}
