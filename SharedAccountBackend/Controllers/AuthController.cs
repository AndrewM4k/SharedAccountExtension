using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.Tokens;
using SharedAccountBackend.Data;
using SharedAccountBackend.Helpers;
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
            user.RefreshTokenExpiry = SettingConstants.RefreshTokenExpire;
            await _db.SaveChangesAsync();

            SetTokenCookies(accessToken, refreshToken);

            return Ok(new { message = "Login successful" });
        }

        [HttpPost("refresh-token")]
        //[ValidateAntiForgeryToken]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refresh_token"];

            if (string.IsNullOrEmpty(refreshToken))
                return BadRequest("Refresh token is required");
            // Ищем пользователя по refresh token
            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

            if (user == null || user.RefreshTokenExpiry <= DateTime.UtcNow)
            {
                return Unauthorized("Invalid refresh token");
            }

            // Генерируем новую пару токенов
            var newAccessToken = _tokenService.GenerateAccessToken(user);
            var newRefreshToken = _tokenService.GenerateRefreshToken();

            // Обновляем пользователя
            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiry = SettingConstants.RefreshTokenExpire;
            await _db.SaveChangesAsync();

            // Устанавливаем новые куки
            SetTokenCookies(newAccessToken, newRefreshToken);

            return Ok(new
            {
                message = "Tokens refreshed successfully",
                access_token = newAccessToken // Для дебага
            });
        }

        private void SetTokenCookies(string accessToken, string? refreshToken)
        {

            bool isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";

            Response.Cookies.Delete("access_token");
            Response.Cookies.Delete("refresh_token");

            Thread.Sleep(500);

            // Access token cookie
            Response.Cookies.Append("access_token", accessToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                //Expires = SettingConstants.AccessTokenExpire,
                Domain = isDevelopment ? null : SettingConstants.Domain,
                Path = "/",
                IsEssential = true
            });

            // Refresh token cookie
            Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = SettingConstants.RefreshTokenExpire,
                Domain = isDevelopment ? null : SettingConstants.Domain,
                Path = "/",
                IsEssential = true
            });

            //Response.Headers["Set-Cookie"] = new StringValues(new[]
            //{
            //    $"access_token={accessToken}; Expires={SettingConstants.AccessTokenExpire:R}; Path=/; Domain=localhost; HttpOnly; {(isDevelopment ? "" : "Secure; ")}SameSite={(isDevelopment ? "Lax" : "None")}",
            //    $"refresh_token={refreshToken}; Expires={SettingConstants.RefreshTokenExpire:R}; Path=/; Domain=localhost; HttpOnly; {(isDevelopment ? "" : "Secure; ")}SameSite={(isDevelopment ? "Lax" : "None")}"
            //});
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
        public async Task<IActionResult> CheckAuth()
        {
            // Проверяем, аутентифицирован ли пользователь
            if (User.Identity?.IsAuthenticated ?? false)
            {
                return Ok(new { isAuthenticated = true });
            }

            var refreshToken = Request.Cookies["refresh_token"];
            if (!string.IsNullOrEmpty(refreshToken))
            {
                // Проверяем в базе
                var user = _db.Users.FirstOrDefault(u =>
                    u.RefreshToken == refreshToken &&
                    u.RefreshTokenExpiry > DateTime.UtcNow);

                if (user != null)
                {
                    Response.Cookies.Delete("access_token");
                }
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
