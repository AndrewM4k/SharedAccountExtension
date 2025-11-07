using SharedAccountBackend.Models;

namespace SharedAccountBackend.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<User?> GetByRefreshTokenAsync(string refreshToken);
        Task<User?> GetByRefreshTokenWithValidExpiryAsync(string refreshToken);
        Task<User?> GetByIdAsync(int id);
        Task UpdateAsync(User user);
        Task SaveChangesAsync();
    }
}

