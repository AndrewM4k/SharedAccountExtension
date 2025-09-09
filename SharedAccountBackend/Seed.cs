using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Data;
using SharedAccountBackend.Enums;
using SharedAccountBackend.Models;
using SharedAccountBackend.Services;

namespace SharedAccountBackend
{
    public static class Seed
    {
        public static async Task SeedDataContext(this IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cs = scope.ServiceProvider.GetRequiredService<CryptoService>();

            var credentialsExists = await context.SharedAccounts.AnyAsync(u => u.IsActive);

            if (!credentialsExists)
            {
                var password = "Kentucky$9598";
                var login = "331271";

                var initialCredentials = new SharedAccount
                {
                    IsActive = true,
                    CopartLogin = login,
                    CopartPassword = cs.Encrypt(password)
                };

                context.SharedAccounts.Add(initialCredentials);
                await context.SaveChangesAsync();
            }

            const string adminUsername = "AdminIsGod";
            var adminExists = await context.Users.AnyAsync(u => u.Username == adminUsername);
            if (!adminExists)
            {
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
