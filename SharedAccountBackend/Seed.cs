using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Data;
using SharedAccountBackend.Enums;
using SharedAccountBackend.Models;

namespace SharedAccountBackend
{
    public static class Seed
    {
        public static async Task SeedDataContext(this IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            const string adminUsername = "AdminIsGod";
            var adminExists = await context.Users.AnyAsync(u => u.Username == adminUsername);
            if (!adminExists)
            {
                // Генерация надежного пароля
                var password = "InitialPassword300_500$";
                Console.WriteLine($"Admin password: {password}"); // Для начального использования

                var admin = new User
                {
                    Username = adminUsername,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Role = Role.Admin,
                };

                context.Users.Add(admin);
                await context.SaveChangesAsync();
            }
        }
    }
}
