using System.Net;
using System.Runtime.ConstrainedExecution;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SharedAccountBackend;
using SharedAccountBackend.Data;
using SharedAccountBackend.Hubs;
using SharedAccountBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// Настройка Kestrel (HTTPS)
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenLocalhost(5000); // HTTP
    serverOptions.ListenLocalhost(5001, listenOptions =>
    { // HTTPS
        listenOptions.UseHttps();
    });
});

// Добавление сервисов
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["TokenSecret"]!)),
            ValidateIssuer = false,
            ValidateAudience = false,
            //ValidIssuer = builder.Configuration["TokenSecretIssuer"],
            //ValidAudience = builder.Configuration["TokenSecretAudience"],
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Берем токен из куки
                context.Token = context.Request.Cookies["access_token"];
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "API", Version = "v1" });
});

// Database (требует PostgreSQL в appsettings.json)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL")
    //,
    //o => o.MigrationsAssembly("SharedAccountBackend.Migrations.Project")
    ));

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(
                "chrome-extension://imambnhajobfgoahcheibndblofimcof", // Ваш ID расширения
                "chrome-extension://gomflnllnhfmojochmdhldmdiglhobej", // Ваш ID расширения
                "https://localhost:5001",
                "http://localhost:5000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("X-XSRF-TOKEN", "Set-Cookie")
            .AllowCredentials()

            //.SetIsOriginAllowed(origin =>
            //    origin.Contains("chrome-extension://") ||
            //    origin.StartsWith("http://localhost"))
            ;
    });
});
builder.Services.AddHttpClient("CopartClient", client =>
{
    client.BaseAddress = new Uri("https://www.copart.com/");
    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    client.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
    client.DefaultRequestHeaders.Add("Accept-Language", "ru,en;q=0.9,en-GB;q=0.8,en-US;q=0.7");
    client.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br, zstd");
    client.DefaultRequestHeaders.Add("Connection", "keep-alive");
    client.DefaultRequestHeaders.Add("Upgrade-Insecure-Requests", "1");
}).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
{
    UseCookies = true,
    AllowAutoRedirect = true,
    AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
});
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<SeleniumService>();
builder.Services.AddSingleton<CryptoService>();
builder.Services.AddSwaggerGen(c =>
    {
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });

        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme (Example: 'Bearer 12345abcdef') AdminIsGod InitialPassword300_500$ ",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });
    }
);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}
// Middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        c.ConfigObject.AdditionalItems["requestOptions"] = new
        {
            credentials = "include" // Разрешить отправку кук
        };
    });
}
app.UseRouting();
app.UseCors("AllowAll");
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("Access-Control-Allow-Origin",
        context.Request.Headers["Origin"]);
    context.Response.Headers.Add("Access-Control-Allow-Credentials", "true");

    if (context.Request.Method == "OPTIONS")
    {
        context.Response.Headers.Add("Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS");
        context.Response.Headers.Add("Access-Control-Allow-Headers",
            "Content-Type, Authorization");
        context.Response.StatusCode = 200;
        return;
    }

    await next();
});
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<LogHub>("/logHub");


await app.Services.SeedDataContext();

app.Run();

