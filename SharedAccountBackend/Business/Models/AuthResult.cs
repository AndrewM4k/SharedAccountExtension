namespace SharedAccountBackend.Business.Models
{
    public class AuthResult
    {
        public bool Success { get; set; }
        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiry { get; set; }
        public string? ErrorMessage { get; set; }
    }
}


