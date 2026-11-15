# syntax=docker/dockerfile:1

# ---------- Stage 1: build ----------
# The SDK image (~800 MB) has the compiler; it is only used to produce the published output.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the files that decide the NuGet packages first. Docker caches each layer, so as long
# as these files do not change, `dotnet restore` is reused and rebuilds take seconds.
COPY Directory.Build.props Directory.Packages.props ./
COPY src/JobTracker.Domain/JobTracker.Domain.csproj src/JobTracker.Domain/
COPY src/JobTracker.Application/JobTracker.Application.csproj src/JobTracker.Application/
COPY src/JobTracker.Infrastructure/JobTracker.Infrastructure.csproj src/JobTracker.Infrastructure/
COPY src/JobTracker.Api/JobTracker.Api.csproj src/JobTracker.Api/
RUN dotnet restore src/JobTracker.Api/JobTracker.Api.csproj

# Now the source code, which changes often.
COPY src/ src/
RUN dotnet publish src/JobTracker.Api/JobTracker.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

# ---------- Stage 2: runtime ----------
# The runtime image only has what is needed to run (~230 MB): no SDK, no source code.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# The image ships a non-root user; running as root inside a container is an unnecessary risk.
USER $APP_UID

# ASP.NET Core in these images listens on port 8080 by default.
EXPOSE 8080
ENTRYPOINT ["dotnet", "JobTracker.Api.dll"]
