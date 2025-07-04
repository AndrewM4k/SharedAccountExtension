using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SharedAccountBackend;
using SharedAccountBackend.Data;
using SharedAccountBackend.Hubs;
using SharedAccountBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// ��������� Kestrel (HTTPS)
builder.WebHost.ConfigureKestrel(serverOptions => {
    serverOptions.ListenLocalhost(5000); // HTTP
    serverOptions.ListenLocalhost(5001, listenOptions => { // HTTPS
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
});

// Database (������� PostgreSQL � appsettings.json)
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
                "chrome-extension://imambnhajobfgoahcheibndblofimcof", // ��� ID ����������
                "https://localhost:5001",
                "http://localhost:5000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            
        //.SetIsOriginAllowed(origin =>
        //    origin.Contains("chrome-extension://") ||
        //    origin.StartsWith("http://localhost"))
            ;
    });
});

builder.Services.AddScoped<TokenService>();
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
            credentials = "include" // ��������� �������� ���
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

