namespace JobTracker.Api.Models;

public class JobApplication
{
    public int Id { get; set; }
    public string Company { get; set; } = "";
    public string Position { get; set; } = "";
    public string Status { get; set; } = "Applied";
    public DateOnly? AppliedDate { get; set; }
    public string? VacancyUrl { get; set; }
}
