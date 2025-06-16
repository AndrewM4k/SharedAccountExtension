namespace SharedAccountBackend.Models
{
    public class CopartAction
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public DateTime ActionTime { get; set; }
        public string ActionType { get; set; } // "BID", "PURCHASE", etc.
        public string LotNumber { get; set; }
        public string Details { get; set; } // JSON
    }
}
