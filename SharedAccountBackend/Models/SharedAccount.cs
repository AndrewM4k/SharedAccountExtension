namespace SharedAccountBackend.Models
{
    public class SharedAccount
    {
        public int Id { get; set; }
        public bool IsActive { get; set; }
        public string CopartLogin { get; set; }
        public string CopartPassword { get; set; } // :TODO Шифровать!
    }
}
