using FluentValidation;

namespace JobTracker.Application.Applications;

public class SaveApplicationRequestValidator : AbstractValidator<SaveApplicationRequest>
{
    public SaveApplicationRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(r => r.Company).NotEmpty().MaximumLength(200);
        RuleFor(r => r.Position).NotEmpty().MaximumLength(200);

        RuleFor(r => r.JobUrl)
            .MaximumLength(2048)
            .Must(BeAnHttpUrl).WithMessage("Job URL must be a valid http or https address.")
            .When(r => !string.IsNullOrWhiteSpace(r.JobUrl));

        RuleFor(r => r.Location).MaximumLength(200);

        RuleFor(r => r.WorkMode).NotNull().IsInEnum();
        RuleFor(r => r.Source).NotNull().IsInEnum();

        RuleFor(r => r.SalaryAmount).InclusiveBetween(0, 9_999_999_999.99m);

        RuleFor(r => r.SalaryCurrency)
            .Matches("^[A-Za-z]{3}$").WithMessage("Currency must be a 3-letter code such as MXN or USD.")
            .When(r => !string.IsNullOrWhiteSpace(r.SalaryCurrency));

        // One day of tolerance: the server runs in UTC and the user may be in a later time zone.
        RuleFor(r => r.AppliedOn)
            .NotNull()
            .GreaterThanOrEqualTo(new DateOnly(2000, 1, 1))
            .Must(date => date <= DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime).AddDays(1))
            .WithMessage("Applied date cannot be in the future.");

        RuleFor(r => r.Notes).MaximumLength(4000);
    }

    private static bool BeAnHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out Uri? uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}

public class ChangeStatusRequestValidator : AbstractValidator<ChangeStatusRequest>
{
    public ChangeStatusRequestValidator()
    {
        RuleFor(r => r.Status).NotNull().IsInEnum();
        RuleFor(r => r.Note).MaximumLength(1000);
    }
}

public class ApplicationListQueryValidator : AbstractValidator<ApplicationListQuery>
{
    public ApplicationListQueryValidator()
    {
        RuleFor(q => q.Search).MaximumLength(100);

        RuleFor(q => q.Page).GreaterThanOrEqualTo(1);

        // An upper bound stops a client from asking for the whole table in one request.
        RuleFor(q => q.PageSize).InclusiveBetween(1, 100);

        RuleFor(q => q.SortBy)
            .Must(sortBy => ApplicationSortFields.All.Contains(sortBy, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Sort field must be one of: {string.Join(", ", ApplicationSortFields.All)}.");

        RuleFor(q => q.SortDir)
            .Must(sortDir => sortDir is not null && (sortDir.Equals("asc", StringComparison.OrdinalIgnoreCase) || sortDir.Equals("desc", StringComparison.OrdinalIgnoreCase)))
            .WithMessage("Sort direction must be 'asc' or 'desc'.");
    }
}
