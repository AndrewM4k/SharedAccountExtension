namespace SharedAccountBackend.Options
{
    public class SeedOptions
    {
        public SharedAccountOptions? DefaultSharedAccount { get; set; }
        public AdminOptions? Admin { get; set; }

        public class SharedAccountOptions
        {
            public bool Enabled { get; set; }
            public string? Login { get; set; }
            public string? Password { get; set; }
        }

        public class AdminOptions
        {
            public bool Enabled { get; set; }
            public string? Username { get; set; }
            public string? Password { get; set; }
        }
    }
}

