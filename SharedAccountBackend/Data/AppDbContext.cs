using Microsoft.EntityFrameworkCore;
using SharedAccountBackend.Models;

namespace SharedAccountBackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<CopartAction> CopartActions { get; set; }
        public DbSet<PageViewAction> PageViewActions { get; set; }
        public DbSet<SharedAccount> SharedAccounts { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=mac1475963");
        }
    }
}
