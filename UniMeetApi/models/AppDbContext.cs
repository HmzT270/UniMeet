using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace UniMeetApi
{
    public class User
    {
        public int UserId { get; set; }
        [Required, EmailAddress] public string Email { get; set; } = null!;
        [Required] public string FullName { get; set; } = null!;
    }

    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
    }
}
