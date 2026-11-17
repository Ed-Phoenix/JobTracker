using Npgsql;

namespace JobTracker.Infrastructure.Persistence;

/// <summary>
/// Npgsql only understands key/value connection strings ("Host=...;Database=..."), while hosting
/// providers such as Neon, Render or Heroku hand out URLs ("postgresql://user:pass@host/db?sslmode=require").
/// This converts the URL form so either can be pasted into the configuration as is.
/// </summary>
public static class PostgresConnectionString
{
    public static string Normalize(string connectionString)
    {
        connectionString = StripPastingNoise(connectionString);

        if (!connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            // Never echo the value: it contains the database password.
            if (!connectionString.Contains('='))
            {
                throw new InvalidOperationException(
                    "Connection string 'Default' must be either key/value pairs (Host=...;Database=...) or a postgresql:// URL.");
            }

            return connectionString;
        }

        var uri = new Uri(connectionString);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
        };

        // User info is percent-encoded in a URL, so a password can contain ':' or '@'.
        string[] credentials = uri.UserInfo.Split(':', 2);
        builder.Username = Uri.UnescapeDataString(credentials[0]);
        if (credentials.Length == 2)
        {
            builder.Password = Uri.UnescapeDataString(credentials[1]);
        }

        foreach (string pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            string[] parts = pair.Split('=', 2);
            string key = Uri.UnescapeDataString(parts[0]);
            string value = parts.Length == 2 ? Uri.UnescapeDataString(parts[1]) : string.Empty;

            switch (key.ToLowerInvariant())
            {
                // libpq spells them "verify-full", Npgsql's enum "VerifyFull".
                case "sslmode":
                    builder.SslMode = Enum.Parse<SslMode>(value.Replace("-", ""), ignoreCase: true);
                    break;
                case "channel_binding":
                    builder.ChannelBinding = Enum.Parse<ChannelBinding>(value, ignoreCase: true);
                    break;
            }
        }

        return builder.ConnectionString;
    }

    /// <summary>
    /// Provider dashboards often copy the URL as a shell command (psql 'postgresql://...')
    /// or with quotes and line breaks around it. Keep only the connection string itself.
    /// </summary>
    private static string StripPastingNoise(string value)
    {
        value = value.Trim();
        if (value.StartsWith("psql ", StringComparison.OrdinalIgnoreCase))
        {
            value = value["psql ".Length..].Trim();
        }

        return value.Trim('\'', '"').Trim();
    }
}
