namespace SharedAccountBackend.Helpers
{
    public static class SettingConstants
    {
        public static DateTime AccessTokenExpire() => DateTime.UtcNow.AddMinutes(1);
        public static DateTime RefreshTokenExpire() => DateTime.UtcNow.AddHours(7);
        public const string Domain = "Domain.com";
    }
}
