using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using SharedAccountBackend.Data;
using SharedAccountBackend.Services;
using System.Net;
using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Controllers;
using System.Net.Http;
using SharedAccountBackend.Models;
using System.Text.Json;
using HtmlAgilityPack;


namespace SharedAccountBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CopartAuthController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<CopartAuthController> _logger;
        private readonly CryptoService _cryptoService;
        private readonly AppDbContext _context;

        public CopartAuthController(IHttpClientFactory httpClientFactory, ILogger<CopartAuthController> logger, CryptoService cryptoService, AppDbContext context)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _cryptoService = cryptoService;
            _context = context;
        }

        [HttpPost("auth")]
        public async Task<IActionResult> AuthenticateWithCopart()
        {
            try
            {
                var httpClientHandler = new HttpClientHandler
                {
                    UseCookies = true,
                    CookieContainer = new CookieContainer(),
                    AllowAutoRedirect = false,
                    AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
                };
                using var httpClient = new HttpClient(httpClientHandler);

                // Устанавливаем заголовки браузера
                httpClient.DefaultRequestHeaders.Add("Accept-Language", "ru,en;q=0.9,en-GB;q=0.8,en-US;q=0.7");
                httpClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
                httpClient.DefaultRequestHeaders.Add("Access-Control-Allow-Headers", "Content-Type, X-XSRF-TOKEN");
                httpClient.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br, zstd");

                // 1. Получаем начальную страницу логина для получения кук и XSRF-токена
                var initialResponse = await httpClient.GetAsync("https://www.copart.com/login");
                var initialBody = await initialResponse.Content.ReadAsStringAsync();

                if (!initialResponse.IsSuccessStatusCode)
                {
                    _logger.LogError($"Не удалось загрузить страницу входа: {initialResponse.StatusCode}");
                    return BadRequest(new { Success = false, Message = "Не удалось загрузить страницу входа" });
                }

                // 2. Извлекаем XSRF-токен из кук
                var xsrfToken = ExtractXsrfTokenFromHtml(initialBody);
                if (string.IsNullOrEmpty(xsrfToken))
                {
                    _logger.LogError("XSRF token not found in cookies");
                    return BadRequest(new { Success = false, Message = "Не удалось найти XSRF-токен" });
                }

                // 3. Получаем учетные данные Copart
                var copartCredentials = _context.SharedAccounts.FirstOrDefault(u => u.IsActive);

                if (copartCredentials == null) return BadRequest(new { Success = false, Message = "Нет активных данных" });

                var username = copartCredentials.CopartLogin;
                var password = _cryptoService.Decrypt(copartCredentials.CopartPassword);
                var locationInfo = new LoginLocationInfo
                {
                    CityName = "Minsk",
                    CountryCode = "BLR",
                    CountryName = "Belarus",
                    Latitude = 53.90007,
                    Longitude = 27.56673,
                    StateCode = "",
                    StateName = "Minskaya voblasts'",
                    TimeZone = "+03:00",
                    ZipCode = "220043"
                };
                var options = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase, // или SnakeCase
                    WriteIndented = false
                };

                var locationInfoJson = JsonSerializer.Serialize(locationInfo, options);

                // 4. Подготавливаем данные для авторизации
                var formData = new Dictionary<string, string>
                {
                    ["username"] = username,
                    ["password"] = password, 
                    ["accountTypeValue"] = "0", 
                    ["accountType"] = "0",
                    ["loginLocationInfo"] = locationInfoJson,
                    ["csrfToken"] = xsrfToken
                };

                // 5. Создаем запрос с X-XSRF-TOKEN заголовком
                var authRequest = new HttpRequestMessage(HttpMethod.Post, "https://www.copart.com/processLogin")
                {
                    Content = new FormUrlEncodedContent(formData)
                };
                authRequest.Headers.Add("X-Xsrf-Token", xsrfToken);
                authRequest.Headers.Add("Origin", "https://www.copart.com");
                authRequest.Headers.Add("Referer", "https://www.copart.com/login/");
                authRequest.Headers.Add("Priority", "u=1, i");
                authRequest.Headers.Add("Sec-Ch-Ua", "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Microsoft Edge\";v=\"140\"");
                authRequest.Headers.Add("Sec-Ch-Ua-Mobile", "?0");
                authRequest.Headers.Add("Sec-Ch-Ua-Platform", "\"Windows\"");
                authRequest.Headers.Add("Sec-Fetch-Dest", "empty");
                authRequest.Headers.Add("Sec-Fetch-Mode", "cors");
                authRequest.Headers.Add("Sec-Fetch-Site", "same-origin");
                authRequest.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0");
                authRequest.Headers.Add("X-Requested-With", "XMLHttpRequest");

                // 6. Отправляем запрос на авторизацию
                var authResponse = await httpClient.SendAsync(authRequest);
                var authContent = await authResponse.Content.ReadAsStringAsync();
                
                // 7. Проверяем успешность авторизации по перенаправлению
                if (authResponse.StatusCode == HttpStatusCode.Found ||
                    authResponse.Headers.Location?.ToString().Contains("loginSuccess") == true)
                {
                    // 8. Получаем все куки из контейнера
                    var cookies = httpClientHandler.CookieContainer.GetCookies(new Uri("https://www.copart.com"));
                    var cookieDict = new Dictionary<string, string>();

                    foreach (Cookie cookie in cookies)
                    {
                        cookieDict[cookie.Name] = cookie.Value;
                    }

                    return Ok(new
                    {
                        Success = true,
                        Cookies = cookieDict,
                        RedirectUrl = authResponse.Headers.Location?.ToString()
                    });
                }

                _logger.LogError($"Ошибка авторизации. Status: {authResponse.StatusCode}, Content: {authContent}");
                return BadRequest(new { Success = false, Message = "Ошибка авторизации на Copart" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при авторизации на Copart");
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        private string ExtractXsrfTokenFromHtml(string htmlContent)
        {
            try
            {
                // Проверяем, не является ли содержимое сжатым
                if (htmlContent.StartsWith("\u001f�\b") || htmlContent.Length < 100)
                {
                    _logger.LogError("Content appears to be compressed binary data");
                    return null;
                }

                // 1. Поиск в JavaScript-коде
                var scriptPattern = @"csrfToken\s*:\s*['""]([^'""]+)['""]";
                var scriptMatch = Regex.Match(htmlContent, scriptPattern);
                if (scriptMatch.Success)
                {
                    return scriptMatch.Groups[1].Value;
                }

                // 2. Поиск в мета-тегах
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(htmlContent);

                var metaNodes = htmlDoc.DocumentNode.SelectNodes("//meta[@name='csrf-token' or @name='_csrf']");
                if (metaNodes != null)
                {
                    foreach (var metaNode in metaNodes)
                    {
                        var content = metaNode.GetAttributeValue("content", "");
                        if (!string.IsNullOrEmpty(content))
                        {
                            return content;
                        }
                    }
                }

                // 3. Поиск в input-полях
                var inputNodes = htmlDoc.DocumentNode.SelectNodes("//input[@name='csrfToken' or @name='_csrf']");
                if (inputNodes != null)
                {
                    foreach (var inputNode in inputNodes)
                    {
                        var value = inputNode.GetAttributeValue("value", "");
                        if (!string.IsNullOrEmpty(value))
                        {
                            return value;
                        }
                    }
                }

                // 4. Дополнительные паттерны для поиска
                var patterns = new[]
                {
            @"name=['""]csrfToken['""]\s+value=['""]([^'""]+)['""]",
            @"name=['""]_token['""]\s+value=['""]([^'""]+)['""]",
            @"<meta name=['""]csrf-token['""] content=['""]([^'""]+)['""]"
        };

                foreach (var pattern in patterns)
                {
                    var match = Regex.Match(htmlContent, pattern);
                    if (match.Success)
                    {
                        return match.Groups[1].Value;
                    }
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при извлечении XSRF-токена из HTML: {ex.Message}");
                return null;
            }
        }
    }
}
