namespace SharedAccountBackend.Dtos
{
    public class ActionDto
    {
        public string ActionType { get; set; } // "BID", "PURCHASE", etc.
        public string LotNumber { get; set; }
        public string Details { get; set; } // JSON
        public string Timestamp { get; set; }
        public string Url { get; set; }
        public string BidAmount { get; set; }
        public string Action { get; set; }
        public string LotName { get; set; }
        public string UserBidAmount { get; set; }
        public string PageUrl { get; set; }
        public string PageTitle { get; set; }
        public string Referrer { get; set; }
        public string ElementText { get; set; }
        public string ElementClasses { get; set; }
        public string UserId { get; set; }
        public string UserEmail { get; set; }
        public string ExtensionVersion { get; set; }
    }
}
