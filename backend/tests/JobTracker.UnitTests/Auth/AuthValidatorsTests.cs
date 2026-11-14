using FluentValidation.Results;
using JobTracker.Application.Auth;

namespace JobTracker.UnitTests.Auth;

public class AuthValidatorsTests
{
    private readonly RegisterRequestValidator _registerValidator = new();
    private readonly UpdateProfileRequestValidator _profileValidator = new();

    [Fact]
    public void Register_accepts_a_valid_request()
    {
        ValidationResult result = _registerValidator.Validate(new RegisterRequest("Ana Pérez", "ana@example.com", "Passw0rd-1"));

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("short1A")]        // fewer than 8 characters
    [InlineData("alllowercase1")]  // no uppercase letter
    [InlineData("ALLUPPERCASE1")]  // no lowercase letter
    [InlineData("NoDigitsHere")]   // no digit
    public void Register_rejects_weak_passwords(string password)
    {
        ValidationResult result = _registerValidator.Validate(new RegisterRequest("Ana", "ana@example.com", password));

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(RegisterRequest.Password));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    public void Register_rejects_invalid_emails(string email)
    {
        ValidationResult result = _registerValidator.Validate(new RegisterRequest("Ana", email, "Passw0rd-1"));

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(RegisterRequest.Email));
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(90, true)]
    [InlineData(91, false)]
    public void Update_profile_requires_follow_up_days_between_1_and_90(int days, bool expected)
    {
        ValidationResult result = _profileValidator.Validate(new UpdateProfileRequest("Ana", days));

        Assert.Equal(expected, result.IsValid);
    }
}
