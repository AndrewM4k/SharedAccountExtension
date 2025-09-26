using OpenQA.Selenium;
using OpenQA.Selenium.Interactions;
using System.Drawing;


namespace SharedAccountBackend.Services
{
    public class HumanLikeMouseMover
    {
        private readonly IWebDriver _driver;
        private readonly Random _random;
        private Point _currentPosition;

        public HumanLikeMouseMover(IWebDriver driver)
        {
            _driver = driver;
            _random = new Random();
            _currentPosition = new Point(0, 0);
        }

        public async Task HumanLikeMove(int steps = 3, int maxStepSize = 80)
        {
            var viewport = GetViewportSize();

            // Генерируем конечную цель в пределах viewport
            int targetX = _random.Next(50, viewport.width - 50);
            int targetY = _random.Next(50, viewport.height - 50);

            await MoveToPositionSmoothly(targetX, targetY, steps, maxStepSize);
        }

        private async Task MoveToPositionSmoothly(int targetX, int targetY, int steps, int maxStepSize)
        {
            int startX = _currentPosition.X;
            int startY = _currentPosition.Y;

            for (int i = 1; i <= steps; i++)
            {
                // Кривая Безье для плавности
                double t = (double)i / steps;
                double smoothT = t * t * (3 - 2 * t); // smoothstep function

                int currentX = (int)(startX + (targetX - startX) * smoothT);
                int currentY = (int)(startY + (targetY - startY) * smoothT);

                // Ограничиваем границы
                var viewport = GetViewportSize();
                currentX = Math.Max(10, Math.Min(viewport.width - 10, currentX));
                currentY = Math.Max(10, Math.Min(viewport.height - 10, currentY));

                // Вычисляем смещение от текущей позиции
                int offsetX = currentX - _currentPosition.X;
                int offsetY = currentY - _currentPosition.Y;

                if (offsetX != 0 || offsetY != 0)
                {
                    new Actions(_driver)
                        .MoveByOffset(offsetX, offsetY)
                        .Perform();

                    _currentPosition = new Point(currentX, currentY);
                }

                // Случайная задержка между шагами
                await Task.Delay(_random.Next(50, 150));
            }

            await Task.Delay(_random.Next(200, 500));
        }

        private (int width, int height) GetViewportSize()
        {
            var jsExecutor = (IJavaScriptExecutor)_driver;
            var width = Convert.ToInt32(jsExecutor.ExecuteScript("return Math.min(document.documentElement.clientWidth, window.innerWidth);"));
            var height = Convert.ToInt32(jsExecutor.ExecuteScript("return Math.min(document.documentElement.clientHeight, window.innerHeight);"));
            return (width, height);
        }
    }
}
