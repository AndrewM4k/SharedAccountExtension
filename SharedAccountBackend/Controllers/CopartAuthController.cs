using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SharedAccountBackend.Data;
using SharedAccountBackend.Services;
using SharedAccountBackend.Repositories;
using SharedAccountBackend.Models;
using SharedAccountBackend.Enums;
using System.Security.Claims;


namespace SharedAccountBackend.Controllers
{
    // Controllers/CopartAuthController.cs
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CopartAuthController : ControllerBase
    {
        private readonly ILogger<CopartAuthController> _logger;
        private readonly CryptoService _cryptoService;
        private readonly AppDbContext _context;
        private readonly SeleniumService _seleniumService;
        private readonly ICopartActionRepository _copartActionRepository;

        public CopartAuthController(ILogger<CopartAuthController> logger,
                                  CryptoService cryptoService,
                                  AppDbContext context,
                                  SeleniumService seleniumService,
                                  ICopartActionRepository copartActionRepository)
        {
            _logger = logger;
            _cryptoService = cryptoService;
            _context = context;
            _seleniumService = seleniumService;
            _copartActionRepository = copartActionRepository;
        }

        [HttpPost("auth")]
        public async Task<IActionResult> AuthenticateWithCopart()
        {
            try
            {
                // Получаем учетные данные Copart
                var copartCredentials = _context.SharedAccounts.FirstOrDefault(u => u.IsActive);
                if (copartCredentials == null)
                    return BadRequest(new { Success = false, Message = "Нет активных данных" });

                var username = copartCredentials.CopartLogin;
                var password = _cryptoService.Decrypt(copartCredentials.CopartPassword);

                // Выполняем авторизацию через Selenium
                var cookies = await _seleniumService.LoginToCopart(username, password);

                if (cookies != null && cookies.Any())
                {
                    _logger.LogInformation("Авторизация через Selenium успешна");

                    // Get current user ID from claims
                    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    
                    // Create Login action for successful Copart authentication
                    if (!string.IsNullOrEmpty(userId))
                    {
                        await _copartActionRepository.AddAsync(new CopartAction
                        {
                            UserId = userId,
                            ActionType = ActionTypes.Login.ToString(),
                            LotNumber = null,
                            LotName = null,
                            Commentary = null,
                            UserBidAmount = null,
                            PageUrl = null,
                            Details = null,
                            ActionTime = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow
                        });
                        await _copartActionRepository.SaveChangesAsync();
                        _logger.LogInformation("Login action created for user {UserId}", userId);
                    }

                    // Формируем куки в формате для расширения
                    var cookieObjects = cookies.Select(cookie => new
                    {
                        name = cookie.Key,
                        value = cookie.Value,
                        domain = ".copart.com",
                        path = "/",
                        secure = true,
                        httpOnly = cookie.Key.Contains("SESSION") || cookie.Key.Contains("AUTH"), // Определяем HttpOnly на основе имени
                        sameSite = "lax",
                        expirationDate = DateTime.Now.AddHours(2).ToUniversalTime().Subtract(new DateTime(1970, 1, 1)).TotalSeconds
                    }).ToList();

                    return Ok(new
                    {
                        Success = true,
                        Cookies = cookieObjects,
                        UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" // Передаем UserAgent для一致性
                    });
                }
                else
                {
                    _logger.LogError("Авторизация через Selenium не удалась");
                    return BadRequest(new { Success = false, Message = "Ошибка авторизации на Copart" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при авторизации на Copart через Selenium");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

       
    }
}
