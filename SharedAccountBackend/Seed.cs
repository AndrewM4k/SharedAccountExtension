using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SharedAccountBackend.Data;
using SharedAccountBackend.Enums;
using SharedAccountBackend.Models;
using SharedAccountBackend.Options;
using SharedAccountBackend.Services;

namespace SharedAccountBackend
{
    public static class Seed
    {
        public static async Task SeedDataContext(this IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cryptoService = scope.ServiceProvider.GetRequiredService<CryptoService>();
            var seedOptions = scope.ServiceProvider.GetRequiredService<IOptions<SeedOptions>>().Value;
            var loggerFactory = scope.ServiceProvider.GetRequiredService<ILoggerFactory>();
            var logger = loggerFactory.CreateLogger("DataSeeder");

            if (seedOptions.DefaultSharedAccount?.Enabled == true)
            {
                if (string.IsNullOrWhiteSpace(seedOptions.DefaultSharedAccount.Login) ||
                    string.IsNullOrWhiteSpace(seedOptions.DefaultSharedAccount.Password))
                {
                    logger.LogWarning("Default shared account seeding is enabled but login or password is missing. Skipping shared account seed.");
                }
                else
                {
                    var credentialsExists = await context.SharedAccounts.AnyAsync(u => u.IsActive);

                    if (!credentialsExists)
                    {
                        var initialCredentials = new SharedAccount
                        {
                            IsActive = true,
                            CopartLogin = seedOptions.DefaultSharedAccount.Login!,
                            CopartPassword = cryptoService.Encrypt(seedOptions.DefaultSharedAccount.Password!)
                        };

                        context.SharedAccounts.Add(initialCredentials);
                        await context.SaveChangesAsync();
                        logger.LogInformation("Seeded default shared account credentials.");
                    }
                }
            }

            if (seedOptions.Admin?.Enabled == true)
            {
                if (string.IsNullOrWhiteSpace(seedOptions.Admin.Username) ||
                    string.IsNullOrWhiteSpace(seedOptions.Admin.Password))
                {
                    logger.LogWarning("Admin seeding is enabled but username or password is missing. Skipping admin seed.");
                }
                else
                {
                    var adminExists = await context.Users.AnyAsync(u => u.Username == seedOptions.Admin.Username);
                    if (!adminExists)
                    {
                        var admin = new User
                        {
                            Username = seedOptions.Admin.Username!,
                            PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedOptions.Admin.Password!),
                            Role = Role.Admin,
                        };

                        context.Users.Add(admin);
                        await context.SaveChangesAsync();
                        logger.LogInformation("Seeded default admin user {Admin}.", seedOptions.Admin.Username);
                    }
                }
            }
        }
    }
}
