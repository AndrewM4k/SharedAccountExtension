namespace SharedAccountBackend.Models
{
    public class CopartAuthResult
    {
        public bool Success { get; set; }
        public Dictionary<string, string> Cookies { get; set; }
        public string UserAgent { get; set; }
    }
}
