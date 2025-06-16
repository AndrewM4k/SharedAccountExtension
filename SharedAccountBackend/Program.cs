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

// Database (требует PostgreSQL в appsettings.json)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL")
        //,
        //o => o.MigrationsAssembly("SharedAccountBackend.Migrations.Project")
    ));

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowExtension", policy =>
    {
        policy.AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
        //.SetIsOriginAllowed(origin =>
        //    origin.Contains("chrome-extension://") ||
        //    origin.StartsWith("http://localhost"))
            ;
    });
});


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
}
app.UseRouting();
//app.UseCors("AllowExtension");
app.UseCors("AllowAll");
//app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapHub<LogHub>("/logHub");

app.Run();