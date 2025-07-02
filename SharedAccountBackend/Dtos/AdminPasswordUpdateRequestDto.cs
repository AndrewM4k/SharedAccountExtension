using System.ComponentModel.DataAnnotations;

namespace SharedAccountBackend.Dtos
{
    public class AdminPasswordUpdateRequestDto
    {
        public int Id { get; set; }
        public string? Username { get; set; }
        [DataType(DataType.Password)]
        public string? NewPassword { get; set; }
    }
}
