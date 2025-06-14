using System;

namespace SharedAccountBackend.Models
{
    public class UserAction
    {
        public int Id { get; set; }
        public string Action { get; set; } // пример: "Logged in to Facebook", в зависимости от потребности можно потом свети к enum
        public DateTime Timestamp { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
    }
}
