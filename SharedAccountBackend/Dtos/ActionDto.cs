namespace SharedAccountBackend.Dtos
{
    public class ActionDto
    {
        public string ActionType { get; set; } // "BID", "PURCHASE", etc.
        public string LotNumber { get; set; }
        public string Details { get; set; } // JSON
    }
}
