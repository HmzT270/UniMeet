using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace UniMeetApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public EventsController(AppDbContext db)
        {
            _db = db;
        }

        // === DTOs ===
        public record EventDto(
            int EventId,
            string Title,
            string Location,
            DateTime StartAt,
            DateTime? EndAt,
            int Quota,
            int ClubId,
            string? Description,
            bool IsCancelled
        );

        public record CreateEventRequest(
            string Title,
            string Location,
            DateTime StartAt,
            DateTime? EndAt,
            int Quota,
            int ClubId,
            string? Description
        );

        public record UpdateEventRequest(
            string Title,
            string Location,
            DateTime StartAt,
            DateTime? EndAt,
            int Quota,
            int ClubId,
            string? Description,
            bool? IsCancelled
        );

        // === Helpers ===
        private static EventDto ToDto(Event e) => new(
            e.EventId,
            e.Title,
            e.Location,
            e.StartAt,
            e.EndAt,
            e.Quota,
            e.ClubId,
            e.Description,
            e.IsCancelled
        );

        private int? GetCurrentUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(id, out var uid) ? uid : null;
        }

        // === Everyone can view ===

        [HttpGet]
        public async Task<ActionResult<List<EventDto>>> GetAll([FromQuery] bool includeCancelled = false)
        {
            var query = _db.Events.AsNoTracking();
            if (!includeCancelled)
                query = query.Where(e => !e.IsCancelled);

            var list = await query
                .OrderBy(e => e.StartAt)
                .Select(e => ToDto(e))
                .ToListAsync();

            return Ok(list);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<EventDto>> GetById(int id)
        {
            var e = await _db.Events.AsNoTracking().FirstOrDefaultAsync(x => x.EventId == id);
            if (e is null) return NotFound("Etkinlik bulunamadı.");
            return Ok(ToDto(e));
        }

        // === ManagersOnly (Manager/Admin) ===

        // Sadece kulüp yöneticileri etkinlik oluşturabilsin
        [HttpPost]
        [Authorize(Policy = "ManagersOnly")] // alternatif: [Authorize(Roles = "Manager,Admin")]
        public async Task<ActionResult<EventDto>> Create([FromBody] CreateEventRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest("Etkinlik adı zorunludur.");

            if (string.IsNullOrWhiteSpace(req.Location))
                return BadRequest("Etkinlik yeri zorunludur.");

            if (req.Quota < 1)
                return BadRequest("Kontenjan en az 1 olmalıdır.");

            if (req.EndAt.HasValue && req.EndAt.Value < req.StartAt)
                return BadRequest("Bitiş, başlangıçtan önce olamaz.");

            var creatorId = GetCurrentUserId();
            if (creatorId is null)
                return Unauthorized("Kullanıcı bilgisi alınamadı.");

            var entity = new Event
            {
                Title = req.Title.Trim(),
                Location = req.Location.Trim(),
                StartAt = DateTime.SpecifyKind(req.StartAt, DateTimeKind.Utc),
                EndAt = req.EndAt.HasValue ? DateTime.SpecifyKind(req.EndAt.Value, DateTimeKind.Utc) : null,
                Quota = req.Quota,
                ClubId = req.ClubId,
                Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
                IsCancelled = false,
                CreatedByUserId = creatorId.Value,
                CreatedAt = DateTime.UtcNow
            };

            _db.Events.Add(entity);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = entity.EventId }, ToDto(entity));
        }

        // Güncelleme (yalnızca Manager/Admin)
        [HttpPut("{id:int}")]
        [Authorize(Policy = "ManagersOnly")] // alternatif: [Authorize(Roles = "Manager,Admin")]
        public async Task<ActionResult<EventDto>> Update(int id, [FromBody] UpdateEventRequest req)
        {
            var e = await _db.Events.FirstOrDefaultAsync(x => x.EventId == id);
            if (e is null) return NotFound("Etkinlik bulunamadı.");

            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest("Etkinlik adı zorunludur.");
            if (string.IsNullOrWhiteSpace(req.Location))
                return BadRequest("Etkinlik yeri zorunludur.");
            if (req.Quota < 1)
                return BadRequest("Kontenjan en az 1 olmalıdır.");
            if (req.EndAt.HasValue && req.EndAt.Value < req.StartAt)
                return BadRequest("Bitiş, başlangıçtan önce olamaz.");

            e.Title = req.Title.Trim();
            e.Location = req.Location.Trim();
            e.StartAt = DateTime.SpecifyKind(req.StartAt, DateTimeKind.Utc);
            e.EndAt = req.EndAt.HasValue ? DateTime.SpecifyKind(req.EndAt.Value, DateTimeKind.Utc) : null;
            e.Quota = req.Quota;
            e.ClubId = req.ClubId;
            e.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();

            if (req.IsCancelled.HasValue)
                e.IsCancelled = req.IsCancelled.Value;

            await _db.SaveChangesAsync();
            return Ok(ToDto(e));
        }

        // İptal / Sil (kurala göre: yumuşak iptal)
        [HttpDelete("{id:int}")]
        [Authorize(Policy = "ManagersOnly")] // alternatif: [Authorize(Roles = "Manager,Admin")]
        public async Task<IActionResult> Cancel(int id)
        {
            var e = await _db.Events.FirstOrDefaultAsync(x => x.EventId == id);
            if (e is null) return NotFound("Etkinlik bulunamadı.");

            // Yumuşak silme/iptal
            e.IsCancelled = true;
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }

    // ====== NOT: Event model alanlarını kendi yapına göre düzenle ======
    // Eğer projenizde Event entity henüz yoksa, aşağıdaki örneği kullanabilirsiniz.
    // AppDbContext içinde: public DbSet<Event> Events { get; set; } eklemeyi unutmayın.
}
