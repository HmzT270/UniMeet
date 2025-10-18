using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace UniMeetApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _cfg;

        public AuthController(AppDbContext db, IConfiguration cfg)
        {
            _db = db;
            _cfg = cfg;
        }

        // İstek/yanıt tipleri
        public record LoginReq(string Email, string Password);
        public record LoginRes(int UserId, string Email, string FullName, string Role);

        // Basit SHA256 hash (demo). Üretimde ASP.NET Identity / BCrypt önerilir.
        private static string Sha256(string input)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
            var sb = new StringBuilder();
            foreach (var b in bytes) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginRes>> Login([FromBody] LoginReq req)
        {
            if (req is null) return BadRequest("Geçersiz istek.");

            var email = (req.Email ?? "").Trim();
            var password = (req.Password ?? "").Trim();
            if (string.IsNullOrWhiteSpace(email)) return BadRequest("E-posta zorunludur.");
            if (string.IsNullOrWhiteSpace(password)) return BadRequest("Şifre zorunludur.");

            // appsettings.json: "AllowedEmailDomain": "dogus.edu.tr"
            var allowed = (_cfg["AllowedEmailDomain"] ?? "dogus.edu.tr").Trim().ToLowerInvariant();

            // 11 haneli öğrenci no + @dogus.edu.tr
            var rx = new Regex(@"^(\d{12})@dogus\.edu\.tr$", RegexOptions.IgnoreCase);
            if (!rx.IsMatch(email))
                return BadRequest($"E-posta 12 haneli öğrenci no + @{allowed} formatında olmalı. Örn: 202203011029@{allowed}");

            // Kullanıcıyı bul
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user is null)
            {
                // İlk kez giriş: kullanıcıyı oluştur (FullName zorunlu olduğundan local-part'ı kullanıyoruz)
                user = new User
                {
                    Email = email,
                    FullName = email.Split('@')[0],     // örn: 202203011029
                    PasswordHash = Sha256(password),
                    Role = UserRole.Member,
                    IsActive = true
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();
            }
            else
            {
                if (!user.IsActive) return BadRequest("Hesap pasif.");
                if (!string.Equals(user.PasswordHash, Sha256(password), StringComparison.OrdinalIgnoreCase))
                    return BadRequest("Şifre hatalı.");
            }

            return new LoginRes(user.UserId, user.Email, user.FullName, user.Role.ToString());
        }
    }
}
