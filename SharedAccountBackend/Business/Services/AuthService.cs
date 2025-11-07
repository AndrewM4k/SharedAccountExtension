using SharedAccountBackend.Business.Interfaces;
using SharedAccountBackend.Business.Models;
using SharedAccountBackend.Helpers;
using SharedAccountBackend.Models;
using SharedAccountBackend.Repositories;
using SharedAccountBackend.Services;

namespace SharedAccountBackend.Business.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly TokenService _tokenService;

        public AuthService(IUserRepository userRepository, TokenService tokenService)
        {
            _userRepository = userRepository;
            _tokenService = tokenService;
        }

        public async Task<AuthResult> LoginAsync(string username, string password)
        {
            var user = await _userRepository.GetByUsernameAsync(username);

            if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                return new AuthResult
                {
                    Success = false,
                    ErrorMessage = "Invalid username or password"
                };
            }

            return await IssueTokensAsync(user);
        }

        public async Task<AuthResult> RefreshTokenAsync(string? refreshToken)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                return new AuthResult
                {
                    Success = false,
                    ErrorMessage = "Refresh token is required"
                };
            }

            var user = await _userRepository.GetByRefreshTokenWithValidExpiryAsync(refreshToken);

            if (user is null)
            {
                return new AuthResult
                {
                    Success = false,
                    ErrorMessage = "Invalid refresh token"
                };
            }

            return await IssueTokensAsync(user);
        }

        public async Task LogoutAsync(string? refreshToken)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                return;
            }

            var user = await _userRepository.GetByRefreshTokenAsync(refreshToken);

            if (user is null)
            {
                return;
            }

            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;

            await _userRepository.UpdateAsync(user);
            await _userRepository.SaveChangesAsync();
        }

        public Task<User?> GetUserByIdAsync(int id)
        {
            return _userRepository.GetByIdAsync(id);
        }

        private async Task<AuthResult> IssueTokensAsync(User user)
        {
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();
            var refreshTokenExpiry = SettingConstants.RefreshTokenExpire();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiry = refreshTokenExpiry;

            await _userRepository.UpdateAsync(user);
            await _userRepository.SaveChangesAsync();

            return new AuthResult
            {
                Success = true,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                RefreshTokenExpiry = refreshTokenExpiry
            };
        }
    }
}

