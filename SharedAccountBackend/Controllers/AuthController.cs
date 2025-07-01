using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SharedAccountBackend.Data;
using SharedAccountBackend.Models;
using SharedAccountBackend.Services;

namespace SharedAccountBackend.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _logger;
        private readonly TokenService _tokenService;

        public AuthController(AppDbContext db, IConfiguration config, ILogger<AuthController> logger, TokenService tokenService)
        {
            _db = db;
            _config = config;
            _logger = logger;
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid request" });
            }
            var user = _db.Users.FirstOrDefault(u => u.Username == request.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new { message = "Invalid username or password" });

            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
            await _db.SaveChangesAsync();

            SetTokenCookies(accessToken, refreshToken);

            return Ok(new { message = "Login successful" });
        }

        [HttpPost("refresh-token")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RefreshToken()
        {
            var accessToken = Request.Cookies["access_token"];
            var refreshToken = Request.Cookies["refresh_token"];

            if (string.IsNullOrEmpty(accessToken) || string.IsNullOrEmpty(refreshToken))
                return BadRequest("Invalid tokens");

            var principal = _tokenService.GetPrincipalFromExpiredToken(accessToken);
            var userId = int.Parse(principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var user = await _db.Users.FindAsync(userId);

            if (user == null ||
                user.RefreshToken != refreshToken ||
                user.RefreshTokenExpiry <= DateTime.UtcNow)
            {
                return Unauthorized("Invalid refresh token");
            }

            var newAccessToken = _tokenService.GenerateAccessToken(user);
            var newRefreshToken = _tokenService.GenerateRefreshToken();

            // Обновляем refresh token в БД
            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
            await _db.SaveChangesAsync();

            // Устанавливаем новые куки
            SetTokenCookies(newAccessToken, newRefreshToken);

            return Ok(new { message = "Tokens refreshed" });
        }

        private void SetTokenCookies(string accessToken, string? refreshToken)
        {
            // Access token cookie
            Response.Cookies.Append("access_token", accessToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddMinutes(15)
            });

            // Refresh token cookie
            Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddDays(7)
            });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refresh_token"];

            if (!string.IsNullOrEmpty(refreshToken))
            {
                var user = await _db.Users
                    .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

                if (user != null)
                {
                    // Удаляем refresh token из БД
                    user.RefreshToken = null;
                    user.RefreshTokenExpiry = null;
                    await _db.SaveChangesAsync();
                }
            }

            // Удаляем куки
            Response.Cookies.Delete("access_token");
            Response.Cookies.Delete("refresh_token");

            return Ok(new { message = "Logout successful" });
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetActions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string actionType = null,
            [FromQuery] string search = null)
        {
            try
            {
                var query = _db.CopartActions.AsQueryable();

                // Фильтрация по типу действия
                if (!string.IsNullOrEmpty(actionType))
                {
                    query = query.Where(a => a.ActionType == actionType);
                }

                // Поиск по номеру лота или деталям
                if (!string.IsNullOrEmpty(search))
                {
                    query = query.Where(a =>
                        a.LotNumber.Contains(search) ||
                        a.Details.Contains(search));
                }

                // Получаем общее количество для пагинации
                var totalCount = await query.CountAsync();

                // Применяем пагинацию
                var actions = await query
                    .OrderByDescending(a => a.ActionTime)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                return Ok(new
                {
                    Data = actions,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting actions");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("check")]
        public IActionResult CheckAuth()
        {
            // Проверяем, аутентифицирован ли пользователь
            if (User.Identity?.IsAuthenticated ?? false)
            {
                return Ok(new { isAuthenticated = true });
            }
            return Unauthorized(new { isAuthenticated = false });
        }

        [HttpGet("me")]
        [Authorize]
        public IActionResult GetCurrentUser()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = _db.Users.FirstOrDefault(u => u.Id == userId);

            return Ok(new
            {
                user.Username,
                user.Role
            });
        }
    }
}
