using System.Text.Json;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace JobTracker.Api.Filters;

/// <summary>
/// Runs before every controller action: if a FluentValidation validator exists for an
/// action argument, it is executed, and invalid requests are answered with 400
/// (ValidationProblemDetails) without ever reaching the action.
/// </summary>
public class ValidationFilter : IAsyncActionFilter
{
    private readonly IServiceProvider _serviceProvider;

    public ValidationFilter(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // A fresh dictionary (not context.ModelState): model binding already registered the query
        // parameters there in PascalCase, and its keys are case-insensitive, so our camelCase would be lost.
        ModelStateDictionary errors = new();

        foreach (object? argument in context.ActionArguments.Values)
        {
            if (argument is null)
            {
                continue;
            }

            // Look for IValidator<TArgument> in the DI container.
            Type validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (_serviceProvider.GetService(validatorType) is not IValidator validator)
            {
                continue;
            }

            ValidationResult result = await validator.ValidateAsync(
                new ValidationContext<object>(argument), context.HttpContext.RequestAborted);

            foreach (ValidationFailure failure in result.Errors)
            {
                // camelCase keys so they match the JSON property names the client sent.
                string key = JsonNamingPolicy.CamelCase.ConvertName(failure.PropertyName);
                errors.AddModelError(key, failure.ErrorMessage);
            }
        }

        if (!errors.IsValid)
        {
            context.Result = ((ControllerBase)context.Controller).ValidationProblem(errors);
            return;
        }

        await next();
    }
}
