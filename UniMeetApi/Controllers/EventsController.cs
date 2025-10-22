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
        public EventsController(AppDbContext db) => _db = db;

        // === DTOs ===
        public record EventDto(
            int EventId,
            string Title,
            string Location,
            DateTime StartAt,
            DateTime? EndAt,
            int Quota,
            int ClubId,
            string? ClubName,   // navigation olmadan subquery ile dolduruyoruz
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
        private int? GetCurrentUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(id, out var uid) ? uid : null;
        }

        // === Everyone can view ===
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<List<EventDto>>> GetAll([FromQuery] bool includeCancelled = false)
        {
            // ClubName'ı navigation olmadan subquery ile çekiyoruz
            var query = _db.Events.AsNoTracking();

            if (!includeCancelled)
                query = query.Where(e => !e.IsCancelled);

            var list = await query
                .OrderBy(e => e.StartAt)
                .Select(e => new EventDto(
                    e.EventId,
                    e.Title,
                    e.Location,
                    e.StartAt,
                    e.EndAt,
                    e.Quota,
                    e.ClubId,
                    _db.Clubs
                        .Where(c => c.ClubId == e.ClubId)
                        .Select(c => (string?)c.Name)
                        .FirstOrDefault(), // yoksa null döner
                    e.Description,
                    e.IsCancelled
                ))
                .ToListAsync();

            return Ok(list);
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<ActionResult<EventDto>> GetById(int id)
        {
            var e = await _db.Events.AsNoTracking().FirstOrDefaultAsync(x => x.EventId == id);
            if (e is null) return NotFound("Etkinlik bulunamadı.");

            var clubName = await _db.Clubs
                .Where(c => c.ClubId == e.ClubId)
                .Select(c => (string?)c.Name)
                .FirstOrDefaultAsync();

            var dto = new EventDto(
                e.EventId,
                e.Title,
                e.Location,
                e.StartAt,
                e.EndAt,
                e.Quota,
                e.ClubId,
                clubName,
                e.Description,
                e.IsCancelled
            );

            return Ok(dto);
        }

        // === ManagersOnly (Manager/Admin) ===
        [HttpPost]
        [Authorize(Policy = "ManagersOnly")]
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

            // ClubName'ı subquery ile doldur
            var clubName = await _db.Clubs
                .Where(c => c.ClubId == entity.ClubId)
                .Select(c => (string?)c.Name)
                .FirstOrDefaultAsync();

            var dto = new EventDto(
                entity.EventId,
                entity.Title,
                entity.Location,
                entity.StartAt,
                entity.EndAt,
                entity.Quota,
                entity.ClubId,
                clubName,
                entity.Description,
                entity.IsCancelled
            );

            return CreatedAtAction(nameof(GetById), new { id = entity.EventId }, dto);
        }

        [HttpPut("{id:int}")]
        [Authorize(Policy = "ManagersOnly")]
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

            var clubName = await _db.Clubs
                .Where(c => c.ClubId == e.ClubId)
                .Select(c => (string?)c.Name)
                .FirstOrDefaultAsync();

            var dto = new EventDto(
                e.EventId,
                e.Title,
                e.Location,
                e.StartAt,
                e.EndAt,
                e.Quota,
                e.ClubId,
                clubName,
                e.Description,
                e.IsCancelled
            );

            return Ok(dto);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Policy = "ManagersOnly")]
        public async Task<IActionResult> Cancel(int id)
        {
            var e = await _db.Events.FirstOrDefaultAsync(x => x.EventId == id);
            if (e is null) return NotFound("Etkinlik bulunamadı.");

            e.IsCancelled = true;
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
