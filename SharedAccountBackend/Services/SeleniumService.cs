using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Interactions;
using OpenQA.Selenium.Support.UI;

namespace SharedAccountBackend.Services
{
    public class SeleniumService : IDisposable
    {
        private readonly IWebDriver _driver;
        private readonly ILogger<SeleniumService> _logger;
        private const int AllowedCountOfRetry = 5;

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

            // Stealth-опции
            options.AddArgument("--disable-blink-features=AutomationControlled");
            options.AddExcludedArgument("enable-automation");
            options.AddAdditionalOption("useAutomationExtension", false);

            // Отключение автоматического обнаружения автоматизации
            options.AddExcludedArgument("enable-automation");
            options.AddAdditionalOption("useAutomationExtension", false);

            _driver = new ChromeDriver(options);

            // Установка времени ожидания по умолчанию
            _driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(30);
            _driver.Manage().Timeouts().PageLoad = TimeSpan.FromSeconds(30);
        }

        public async Task<Dictionary<string, string>> LoginToCopart(string username, string password)
        {
            for (int i = 0; i < AllowedCountOfRetry; i++)
            {
                try
                {
                    _logger.LogInformation("Начало авторизации на Copart через Selenium");

                    await SeleniumAuth();

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
                        if (i >= AllowedCountOfRetry - 1)
                            throw new Exception("Авторизация не удалась");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Ошибка при авторизации через Selenium на попытке {i + 1}");
                    TakeScreenshot("error");
                }
            }
            return null;
            async Task SeleniumAuth()
            {
                // Переходим на страницу логина
                _driver.Navigate().GoToUrl("https://www.copart.com/login");

                // Ждем загрузки страницы
                await WaitForPageLoad();

                await HumanLikeActions();

                //ПРОВОЦИРУЕМ КАПЧУ
                //for (int i = 0; i < 100; i++)
                //{
                //    _driver.Navigate().GoToUrl("https://www.copart.com/login");
                //}

                // Принимаем куки, если есть всплывающее окно
                //TryAcceptCookies();

                TakeScreenshot("before");

                //if (IsCaptchaPresent())
                //{
                //    TakeScreenshot("Captcha");
                //}

                // Заполняем форму логина
                _logger.LogInformation("Заполнение формы логина");

                var usernameField = WaitForElement(By.Name("username"), TimeSpan.FromSeconds(30));
                var passwordField = WaitForElement(By.Name("password"), TimeSpan.FromSeconds(30));
                var loginButton = WaitForElement(By.CssSelector("button[data-uname='loginSigninmemberbutton']"), TimeSpan.FromSeconds(30));


                await HumanLikeTextEntry(usernameField, username);
                await Task.Delay(800 + new Random().Next(200, 600));
                await HumanLikeTextEntry(passwordField, password);

                //usernameField.SendKeys(username);
                //passwordField.SendKeys(password);

                // Делаем скриншот перед отправкой формы (для отладки)
                TakeScreenshot("before_login");

                // Нажимаем кнопку входа
                loginButton.Click();

                // Ждем завершения авторизации
                _logger.LogInformation("Ожидание завершения авторизации");
                await WaitForNavigation(TimeSpan.FromSeconds(30));
            }
        }

        private bool IsCaptchaPresent()
        {
            try
            {
                // Проверяем различные селекторы hCaptcha
                var hcaptchaSelectors = new[]
                {
                    By.CssSelector("iframe[src*='hcaptcha']"),
                    By.CssSelector(".h-captcha"),
                    By.Id("hcaptcha-container")
                };

                return hcaptchaSelectors.Any(selector =>
                {
                    try
                    {
                        return _driver.FindElement(selector).Displayed;
                    }
                    catch
                    {
                        return false;
                    }
                });
            }
            catch
            {
                return false;
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
            var wait = new WebDriverWait(_driver, TimeSpan.FromSeconds(15));

            wait.Until(driver => jsExecutor.ExecuteScript("return document.readyState").Equals("complete"));

            // Дополнительная задержка для полной загрузки
            await Task.Delay(500);
        }

        private async Task WaitForNavigation(TimeSpan timeout)
        {
            var wait = new WebDriverWait(_driver, timeout);
            wait.Until(driver => !driver.Url.Contains("login") || driver.Url.Contains("dashboard"));

            // Дополнительная задержка
            await Task.Delay(500);
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

        private async Task HumanLikeTextEntry(IWebElement element, string text)
        {
            foreach (char c in text)
            {
                element.SendKeys(c.ToString());
                await Task.Delay(new Random().Next(50, 150)); // Случайные задержки между символами
            }
        }
        private string FindHCaptchaSiteKey()
        {
            try
            {
                // Попробуем найти hCaptcha по различным селекторам
                var hcaptchaSelectors = new[]
                {
                    By.CssSelector("div[data-sitekey]"),
                    By.CssSelector(".h-captcha[data-sitekey]"),
                    By.CssSelector("iframe[src*='hcaptcha.com']")
                };

                foreach (var selector in hcaptchaSelectors)
                {
                    try
                    {
                        var element = _driver.FindElement(selector);
                        var siteKey = element.GetAttribute("data-sitekey");

                        if (!string.IsNullOrEmpty(siteKey))
                        {
                            _logger.LogInformation($"Найден hCaptcha sitekey: {siteKey}");
                            return siteKey;
                        }
                    }
                    catch
                    {
                        // Продолжаем поиск с другими селекторами
                    }
                }

                // Альтернативный метод: поиск через JavaScript
                var jsExecutor = (IJavaScriptExecutor)_driver;
                var siteKeyFromScript = jsExecutor.ExecuteScript(
                    "return document.querySelector('[data-sitekey]')?.dataset?.sitekey || " +
                    "document.querySelector('iframe[src*=\"hcaptcha.com\"]')?.src?.match(/sitekey=([^&]+)/)?.[1]");

                if (siteKeyFromScript != null)
                {
                    _logger.LogInformation($"Найден hCaptcha sitekey через JS: {siteKeyFromScript}");
                    return siteKeyFromScript.ToString();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при поиске hCaptcha sitekey");
            }

            _logger.LogWarning("Не удалось найти hCaptcha sitekey на странице");
            return null;
        }

        private async Task HumanLikeActions()
        {
            // Случайные движения мыши
            var actions = new Actions(_driver);
            var random = new Random();

            //// Случайное перемещение по странице
            //for (int i = 0; i < 3; i++)
            //{
            //    int x = random.Next(100, 500);
            //    int y = random.Next(100, 500);
            //    actions.MoveByOffset(x, y).Perform();
            //    await Task.Delay(random.Next(300, 800));
            //}
            var humanMover = new HumanLikeMouseMover(_driver);
            for (int i = 0; i < 5; i++)
            {
                await humanMover.HumanLikeMove(steps: 4, maxStepSize: 60);
            }

            // Случайные клики
            if (random.Next(0, 100) > 70)
            {
                actions.Click().Perform();
                await Task.Delay(random.Next(200, 500));
            }

            // Случайный скроллинг
            int scrollAmount = random.Next(200, 800);
            ((IJavaScriptExecutor)_driver).ExecuteScript($"window.scrollBy(0, {scrollAmount})");
            await Task.Delay(random.Next(500, 1200));
        }
        private bool IsActionsAvailable()
        {
            try
            {
                // Пробуем небольшое безопасное перемещение
                new Actions(_driver)
                    .MoveByOffset(1, 0)
                    .Perform();
                return true;
            }
            catch
            {
                return false;
            }
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
                            Task.Delay(500).Wait();
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

        private bool HandleLoginErrors()
        {
            try
            {
                // Проверяем наличие сообщений об ошибках
                var errorSelectors = new[]
                {
            By.CssSelector(".error-message"),
            By.CssSelector("[data-uname='loginError']"),
            By.CssSelector(".alert-danger"),
            By.XPath("//*[contains(text(), 'error') or contains(text(), 'invalid')]")
        };

                foreach (var selector in errorSelectors)
                {
                    try
                    {
                        var errorElement = _driver.FindElement(selector);
                        if (errorElement.Displayed)
                        {
                            _logger.LogError($"Ошибка при входе: {errorElement.Text}");
                            return false;
                        }
                    }
                    catch
                    {
                        // Игнорируем, если элемент не найден
                    }
                }

                return true;
            }
            catch
            {
                return true;
            }
        }
    }
}
