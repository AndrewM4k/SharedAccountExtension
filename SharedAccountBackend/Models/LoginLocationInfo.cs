namespace SharedAccountBackend.Models
{
    public class LoginLocationInfo
    {
        public string CityName { get; set; }
        public string CountryCode { get; set; }
        public string CountryName { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string StateCode { get; set; }
        public string StateName { get; set; }
        public string TimeZone { get; set; }
        public string ZipCode { get; set; }
    }
}
