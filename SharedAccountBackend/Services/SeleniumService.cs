using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;

namespace SharedAccountBackend.Services
{
    public class SeleniumService : IDisposable
    {
        private readonly IWebDriver _driver;
        private readonly ILogger<SeleniumService> _logger;

        public SeleniumService(ILogger<SeleniumService> logger)
        {
            _logger = logger;

            // Настройка опций Chrome
            var options = new ChromeOptions();

            // Headless режим (раскомментировать для продакшена)
             options.AddArgument("--headless");

            options.AddArgument("--no-sandbox");
            options.AddArgument("--disable-dev-shm-usage");
            options.AddArgument("--disable-gpu");
            options.AddArgument("--window-size=1920,1080");
            options.AddArgument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

            // Отключение автоматического обнаружения автоматизации
            options.AddExcludedArgument("enable-automation");
            options.AddAdditionalOption("useAutomationExtension", false);

            _driver = new ChromeDriver(options);

            // Установка времени ожидания по умолчанию
            _driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);
            _driver.Manage().Timeouts().PageLoad = TimeSpan.FromSeconds(30);
        }

        public async Task<Dictionary<string, string>> LoginToCopart(string username, string password)
        {
            try
            {
                _logger.LogInformation("Начало авторизации на Copart через Selenium");

                // Переходим на страницу логина
                _driver.Navigate().GoToUrl("https://www.copart.com/login");

                // Ждем загрузки страницы
                await WaitForPageLoad();

                // Принимаем куки, если есть всплывающее окно
                TryAcceptCookies();

                // Заполняем форму логина
                _logger.LogInformation("Заполнение формы логина");

                var usernameField = WaitForElement(By.Name("username"), TimeSpan.FromSeconds(10));
                var passwordField = WaitForElement(By.Name("password"), TimeSpan.FromSeconds(10));
                var loginButton = WaitForElement(By.CssSelector("button[data-uname='loginSigninmemberbutton']"), TimeSpan.FromSeconds(10));

                usernameField.SendKeys(username);
                passwordField.SendKeys(password);

                // Делаем скриншот перед отправкой формы (для отладки)
                TakeScreenshot("before_login");

                // Нажимаем кнопку входа
                loginButton.Click();

                // Ждем завершения авторизации
                _logger.LogInformation("Ожидание завершения авторизации");
                await WaitForNavigation(TimeSpan.FromSeconds(15));

                // Проверяем успешность авторизации
                if (IsLoggedIn())
                {
                    _logger.LogInformation("Авторизация успешна");

                    // Делаем скриншот после авторизации (для отладки)
                    TakeScreenshot("after_login");

                    // Получаем все куки
                    return GetCookies();
                }
                else
                {
                    _logger.LogError("Авторизация не удалась");
                    TakeScreenshot("login_failed");
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при авторизации через Selenium");
                TakeScreenshot("error");
                return null;
            }
        }

        private IWebElement WaitForElement(By locator, TimeSpan timeout)
        {
            var wait = new WebDriverWait(_driver, timeout);
            return wait.Until(driver =>
            {
                var element = driver.FindElement(locator);
                return (element.Displayed && element.Enabled) ? element : null;
            });
        }

        private async Task WaitForPageLoad()
        {
            var jsExecutor = (IJavaScriptExecutor)_driver;
            var wait = new WebDriverWait(_driver, TimeSpan.FromSeconds(30));

            wait.Until(driver => jsExecutor.ExecuteScript("return document.readyState").Equals("complete"));

            // Дополнительная задержка для полной загрузки
            await Task.Delay(2000);
        }

        private async Task WaitForNavigation(TimeSpan timeout)
        {
            var wait = new WebDriverWait(_driver, timeout);
            wait.Until(driver => !driver.Url.Contains("login") || driver.Url.Contains("dashboard"));

            // Дополнительная задержка
            await Task.Delay(3000);
        }

        private bool IsLoggedIn()
        {
            try
            {
                // Проверяем различные признаки успешной авторизации
                return _driver.Url.Contains("dashboard") ||
                       _driver.Url.Contains("myaccount") ||
                       _driver.PageSource.Contains("logout") ||
                       _driver.FindElements(By.CssSelector("[data-uname='UserMenu']")).Count > 0;
            }
            catch
            {
                return false;
            }
        }

        private Dictionary<string, string> GetCookies()
        {
            var cookies = _driver.Manage().Cookies.AllCookies;
            var cookieDict = new Dictionary<string, string>();

            foreach (var cookie in cookies)
            {
                cookieDict[cookie.Name] = cookie.Value;
                _logger.LogInformation($"Cookie: {cookie.Name} = {cookie.Value}");
            }

            return cookieDict;
        }

        private void TryAcceptCookies()
        {
            try
            {
                // Попытка найти и нажать кнопку принятия куки
                var cookieAcceptButtons = new[]
                {
                    By.Id("cookieAccept"),
                    By.CssSelector("[aria-label='Accept cookies']"),
                    By.CssSelector("[data-uname='cookieAccept']"),
                    By.XPath("//button[contains(text(), 'Accept')]")
                };

                foreach (var locator in cookieAcceptButtons)
                {
                    try
                    {
                        var button = _driver.FindElement(locator);
                        if (button.Displayed && button.Enabled)
                        {
                            button.Click();
                            _logger.LogInformation("Приняты куки");
                            Task.Delay(1000).Wait();
                            break;
                        }
                    }
                    catch
                    {
                        // Игнорируем ошибки и пробуем следующий локатор
                    }
                }
            }
            catch
            {
                // Если не удалось принять куки, продолжаем без этого
            }
        }

        private void TakeScreenshot(string name)
        {
            try
            {
                var screenshot = ((ITakesScreenshot)_driver).GetScreenshot();
                var fileName = $"{DateTime.Now:yyyyMMdd_HHmmss}_{name}.png";
                screenshot.SaveAsFile(fileName);
                _logger.LogInformation($"Скриншот сохранен: {fileName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при создании скриншота");
            }
        }

        public void Dispose()
        {
            _driver?.Quit();
            _driver?.Dispose();
        }
    }
}
