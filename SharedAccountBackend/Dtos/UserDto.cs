using SharedAccountBackend.Enums;
using SharedAccountBackend.Models;

namespace SharedAccountBackend.Dtos
{
    public class UserDto
    {
        public string Username { get; set; }
        public int LengthPassword { get; set; }
    }
}
