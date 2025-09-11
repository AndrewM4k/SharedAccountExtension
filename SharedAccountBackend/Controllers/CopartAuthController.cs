using Microsoft.AspNetCore.Mvc;
using SharedAccountBackend.Data;
using SharedAccountBackend.Services;


namespace SharedAccountBackend.Controllers
{
    // Controllers/CopartAuthController.cs
    [ApiController]
    [Route("api/[controller]")]
    public class CopartAuthController : ControllerBase
    {
        private readonly ILogger<CopartAuthController> _logger;
        private readonly CryptoService _cryptoService;
        private readonly AppDbContext _context;
        private readonly SeleniumService _seleniumService;

        public CopartAuthController(ILogger<CopartAuthController> logger,
                                  CryptoService cryptoService,
                                  AppDbContext context,
                                  SeleniumService seleniumService)
        {
            _logger = logger;
            _cryptoService = cryptoService;
            _context = context;
            _seleniumService = seleniumService;
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
                    return Ok(new
                    {
                        Success = true,
                        Cookies = cookies
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
