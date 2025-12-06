using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using SharedAccountBackend.Business.Interfaces;
using SharedAccountBackend.Business.Models;
using SharedAccountBackend.Helpers;

namespace SharedAccountBackend.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IActionService _actionService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            IActionService actionService,
            ILogger<AuthController> logger)
        {
            _authService = authService;
            _actionService = actionService;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid request" });
            }
            var result = await _authService.LoginAsync(request.Email, request.Password);

            if (!result.Success)
            {
                return Unauthorized(new { message = result.ErrorMessage });
            }

            SetTokenCookies(result);

            return Ok(new { message = "Login successful" });
        }

        [HttpPost("refresh-token")]
        //[ValidateAntiForgeryToken]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refresh_token"];

            var result = await _authService.RefreshTokenAsync(refreshToken);

            if (!result.Success)
            {
                return Unauthorized(result.ErrorMessage ?? "Invalid refresh token");
            }

            SetTokenCookies(result);

            return Ok(new
            {
                message = "Tokens refreshed successfully",
                access_token = result.AccessToken
            });
        }

        private void SetTokenCookies(AuthResult result)
        {
            if (string.IsNullOrWhiteSpace(result.AccessToken) || string.IsNullOrWhiteSpace(result.RefreshToken))
            {
                _logger.LogError("Attempted to set cookies with missing tokens.");
                throw new InvalidOperationException("Access and refresh tokens are required.");
            }

            bool isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";

            Response.Cookies.Delete("access_token");
            Response.Cookies.Delete("refresh_token");

            var refreshTokenExpiry = result.RefreshTokenExpiry ?? SettingConstants.RefreshTokenExpire();

            // Access token cookie
            Response.Cookies.Append("access_token", result.AccessToken, new CookieOptions
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
            Response.Cookies.Append("refresh_token", result.RefreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = refreshTokenExpiry,
                Domain = isDevelopment ? null : SettingConstants.Domain,
                Path = "/",
                IsEssential = true
            });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refresh_token"];

            await _authService.LogoutAsync(refreshToken);

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
            [FromQuery] string? actionType = null,
            [FromQuery] string? search = null,
            [FromQuery] string? userId = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] string? details = null)
        {
            try
            {
                var result = await _actionService.GetActionsAsync(page, pageSize, actionType, search, userId, startDate, endDate, details);

                return Ok(new
                {
                    result.Data,
                    result.TotalCount,
                    result.Page,
                    result.PageSize
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
                var result = await _authService.RefreshTokenAsync(refreshToken);

                if (result.Success)
                {
                    SetTokenCookies(result);
                    return Ok(new { isAuthenticated = true });
                }
            }

            return Unauthorized(new { isAuthenticated = false });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = await _authService.GetUserByIdAsync(userId);

            if (user is null)
            {
                return NotFound();
            }

            return Ok(new
            {
                user.Username,
                user.Role
            });
        }
    }
}
