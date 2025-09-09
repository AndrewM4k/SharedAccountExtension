using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using SharedAccountBackend.Models;
using SharedAccountBackend.Data;
using SharedAccountBackend.Services;

namespace SharedAccountBackend.Controllers
{
    [Route("api/[controller]")]
    [Authorize]
    public class CopartAuthController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly AppDbContext _context;
        private readonly CryptoService _cryptoService;

        public CopartAuthController(IHttpClientFactory httpClientFactory, AppDbContext context, CryptoService cs)
        {
            _httpClient = httpClientFactory.CreateClient("CopartClient");
            _context = context;
            _cryptoService = cs;
        }

        [HttpPost("auth")]
        public async Task<IActionResult> AuthenticateWithCopart()
        {
            try
            {
                // Получаем учетные данные Copart из безопасного хранилища
                var copartCredentials = _context.SharedAccounts.FirstOrDefault(u => u.IsActive); 

                if (copartCredentials == null) return BadRequest(new { Success = false, Message = "Нет активных данных" });

                var username = copartCredentials.CopartLogin;
                var password = _cryptoService.Decrypt(copartCredentials.CopartPassword);

                // Выполняем авторизацию на Copart
                var authResult = await LoginToCopart(username, password);

                if (authResult.Success)
                {
                    // Возвращаем куки или токен клиенту
                    return Ok(new
                    {
                        Success = true,
                        Cookies = authResult.Cookies,
                        UserAgent = authResult.UserAgent
                    });
                }

                return BadRequest(new { Success = false, Message = "Ошибка авторизации на Copart" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        private async Task<CopartAuthResult> LoginToCopart(string username, string password)
        {
            // Первый запрос - получаем CSRF-токен и куки
            var initialResponse = await _httpClient.GetAsync("/login/");
            var initialContent = await initialResponse.Content.ReadAsStringAsync();

            // Извлекаем CSRF-токен из HTML (пример, нужно адаптировать под реальную структуру)
            var csrfToken = ExtractCsrfToken(initialContent);

            // Подготавливаем данные для авторизации
            var formData = new Dictionary<string, string>
            {
                ["username"] = username,
                ["password"] = password,
                ["csrf_token"] = csrfToken // Или другое название токена
                                           // Добавьте другие необходимые поля
            };

            // Отправляем запрос на авторизацию
            var authResponse = await _httpClient.PostAsync("/login/", new FormUrlEncodedContent(formData));
            var authContent = await authResponse.Content.ReadAsStringAsync();

            // Проверяем успешность авторизации
            if (authResponse.IsSuccessStatusCode && authContent.Contains("dashboard") || authContent.Contains("my account"))
            {
                // Извлекаем куки из ответа
                var cookies = ExtractCookies(authResponse);

                return new CopartAuthResult
                {
                    Success = true,
                    Cookies = cookies,
                    UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                };
            }

            return new CopartAuthResult { Success = false };
        }

        private string ExtractCsrfToken(string htmlContent)
        {
            // Реализуйте парсинг CSRF-токена из HTML
            // Это пример - точный способ зависит от структуры сайта Copart
            var match = Regex.Match(htmlContent, "name=\"csrf_token\" value=\"([^\"]+)\"");
            return match.Success ? match.Groups[1].Value : string.Empty;
        }

        private Dictionary<string, string> ExtractCookies(HttpResponseMessage response)
        {
            var cookies = new Dictionary<string, string>();

            if (response.Headers.TryGetValues("Set-Cookie", out var cookieValues))
            {
                foreach (var cookie in cookieValues)
                {
                    var cookieParts = cookie.Split(';')[0].Split('=');
                    if (cookieParts.Length >= 2)
                    {
                        cookies[cookieParts[0]] = cookieParts[1];
                    }
                }
            }

            return cookies;
        }
    }

}
