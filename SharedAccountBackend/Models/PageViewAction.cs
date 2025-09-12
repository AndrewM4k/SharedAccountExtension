namespace SharedAccountBackend.Models
{
    public class PageViewAction
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public string ActionType { get; set; }
        public string PageUrl { get; set; }
        public string PageTitle { get; set; }
        public string Referrer { get; set; }
        public DateTime Timestamp { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
