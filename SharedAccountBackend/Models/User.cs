using SharedAccountBackend.Enums;

namespace SharedAccountBackend.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string PasswordHash { get; set; }
        public List<UserAction> Actions { get; set; }
        public Role Role { get; set; }
    }
}
