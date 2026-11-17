using JobTracker.Infrastructure.Persistence;
using Npgsql;

namespace JobTracker.UnitTests.Infrastructure;

public class PostgresConnectionStringTests
{
    [Fact]
    public void Key_value_strings_are_returned_unchanged()
    {
        const string connectionString = "Host=localhost;Port=5433;Database=jobtracker;Username=app;Password=secret";

        Assert.Equal(connectionString, PostgresConnectionString.Normalize(connectionString));
    }

    [Fact]
    public void A_provider_url_is_converted_to_npgsql_settings()
    {
        string result = PostgresConnectionString.Normalize(
            "postgresql://neondb_owner:p%40ss:word@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

        var builder = new NpgsqlConnectionStringBuilder(result);
        Assert.Equal("ep-cool-name-123.us-east-2.aws.neon.tech", builder.Host);
        Assert.Equal(5432, builder.Port);
        Assert.Equal("neondb", builder.Database);
        Assert.Equal("neondb_owner", builder.Username);
        Assert.Equal("p@ss:word", builder.Password);
        Assert.Equal(SslMode.Require, builder.SslMode);
        Assert.Equal(ChannelBinding.Require, builder.ChannelBinding);
    }

    [Fact]
    public void The_postgres_scheme_and_an_explicit_port_are_supported()
    {
        string result = PostgresConnectionString.Normalize("postgres://app:secret@db.internal:6543/jobs?sslmode=verify-full");

        var builder = new NpgsqlConnectionStringBuilder(result);
        Assert.Equal("db.internal", builder.Host);
        Assert.Equal(6543, builder.Port);
        Assert.Equal("jobs", builder.Database);
        Assert.Equal(SslMode.VerifyFull, builder.SslMode);
    }
}
