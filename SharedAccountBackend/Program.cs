using System.Net;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SharedAccountBackend;
using SharedAccountBackend.Data;
using SharedAccountBackend.Business.Interfaces;
using SharedAccountBackend.Business.Services;
using SharedAccountBackend.Hubs;
using SharedAccountBackend.Options;
using SharedAccountBackend.Repositories;
using SharedAccountBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// ��������� Kestrel (HTTPS)
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenLocalhost(5000); // HTTP
    serverOptions.ListenLocalhost(5001, listenOptions =>
    { // HTTPS
        listenOptions.UseHttps();
    });
});

// ���������� ��������
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
                // ����� ����� �� ����
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
        Description = "JWT Authorization header using the Bearer scheme (Example: 'Bearer 12345abcdef')",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
});

// Database (������� PostgreSQL � appsettings.json)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL")
    //,
    //o => o.MigrationsAssembly("SharedAccountBackend.Migrations.Project")
    ));

builder.Services.AddSignalR();

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("ConfiguredCors", policy =>
    {
        policy.WithExposedHeaders("X-XSRF-TOKEN", "Set-Cookie")
              .AllowAnyHeader()
              .AllowAnyMethod();

        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .SetIsOriginAllowedToAllowWildcardSubdomains()
                  .AllowCredentials();
        }
        else
        {
            policy.AllowAnyOrigin();
        }
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
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ICopartActionRepository, CopartActionRepository>();
builder.Services.AddScoped<IPageViewActionRepository, PageViewActionRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IActionService, ActionService>();
builder.Services.Configure<SeedOptions>(builder.Configuration.GetSection("SeedData"));

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
            credentials = "include" // ��������� �������� ���
        };
    });
}
app.UseRouting();
app.UseCors("ConfiguredCors");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<LogHub>("/logHub");


await app.Services.SeedDataContext();

app.Run();

