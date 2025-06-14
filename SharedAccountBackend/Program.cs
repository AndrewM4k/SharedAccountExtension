using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using SharedAccountBackend.Data;
using SharedAccountBackend.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Настройка Kestrel (HTTPS)
builder.WebHost.ConfigureKestrel(serverOptions => {
    serverOptions.ListenLocalhost(5000); // HTTP
    serverOptions.ListenLocalhost(5001, listenOptions => { // HTTPS
        listenOptions.UseHttps();
    });
});

// Добавление сервисов
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "API", Version = "v1" });
});

// Database (требует ConnectionString в appsettings.json)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddSignalR();

var app = builder.Build();

// Middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapHub<LogHub>("/logHub");

app.Run();