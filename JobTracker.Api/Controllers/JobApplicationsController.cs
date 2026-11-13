using JobTracker.Api.Data;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Controllers;

[ApiController]
[Route("api/jobapplications")]
public class JobApplicationsController(ApplicationDbContext db) : ControllerBase
{
    private static readonly string[] ValidStatuses = ["Applied", "Interview", "Rejected", "Offer"];

    [HttpGet]
    public async Task<ActionResult<List<JobApplication>>> GetAll([FromQuery] string? status)
    {
        var query = db.JobApplications.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalized = status.Trim().ToLowerInvariant();
            query = query.Where(application => application.Status.ToLower() == normalized);
        }
        return Ok(await query.OrderByDescending(application => application.Id).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<JobApplication>> GetById(int id)
    {
        var application = await db.JobApplications.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);
        return application is null ? NotFound() : Ok(application);
    }

    [HttpPost]
    public async Task<ActionResult<JobApplication>> Create([FromBody] JobApplicationInput input)
    {
        var error = ValidateAndNormalize(input);
        if (error is not null) return BadRequest(new { message = error });

        var application = new JobApplication();
        ApplyChanges(application, input);
        db.JobApplications.Add(application);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = application.Id }, application);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<JobApplication>> Update(int id, [FromBody] JobApplicationInput input)
    {
        var error = ValidateAndNormalize(input);
        if (error is not null) return BadRequest(new { message = error });

        var application = await db.JobApplications.FindAsync(id);
        if (application is null) return NotFound();
        ApplyChanges(application, input);
        await db.SaveChangesAsync();
        return Ok(application);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var application = await db.JobApplications.FindAsync(id);
        if (application is null) return NotFound();
        db.JobApplications.Remove(application);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static string? ValidateAndNormalize(JobApplicationInput input)
    {
        if (string.IsNullOrWhiteSpace(input.Company)) return "Укажите компанию.";
        if (string.IsNullOrWhiteSpace(input.Position)) return "Укажите должность.";
        input.Company = input.Company.Trim();
        input.Position = input.Position.Trim();
        var status = ValidStatuses.FirstOrDefault(value =>
            string.Equals(value, input.Status?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (status is null) return "Выберите допустимый статус.";
        input.Status = status;
        input.VacancyUrl = string.IsNullOrWhiteSpace(input.VacancyUrl) ? null : input.VacancyUrl.Trim();
        if (input.VacancyUrl is not null &&
            (!Uri.TryCreate(input.VacancyUrl, UriKind.Absolute, out var uri) ||
             (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)))
            return "Ссылка должна начинаться с http:// или https://.";
        return null;
    }

    private static void ApplyChanges(JobApplication application, JobApplicationInput input)
    {
        application.Company = input.Company!;
        application.Position = input.Position!;
        application.Status = input.Status!;
        application.AppliedDate = input.AppliedDate;
        application.VacancyUrl = input.VacancyUrl;
    }
}

public class JobApplicationInput
{
    public string? Company { get; set; }
    public string? Position { get; set; }
    public string? Status { get; set; }
    public DateOnly? AppliedDate { get; set; }
    public string? VacancyUrl { get; set; }
}
