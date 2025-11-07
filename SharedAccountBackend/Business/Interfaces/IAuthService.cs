using SharedAccountBackend.Business.Models;
using SharedAccountBackend.Models;

namespace SharedAccountBackend.Business.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResult> LoginAsync(string username, string password);
        Task<AuthResult> RefreshTokenAsync(string? refreshToken);
        Task LogoutAsync(string? refreshToken);
        Task<User?> GetUserByIdAsync(int id);
    }
}

