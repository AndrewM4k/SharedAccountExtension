# Сборка
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Копируем ТОЛЬКО файл проекта сначала (для лучшего кэширования)
COPY ["SharedAccountBackend.csproj", "."] 
RUN dotnet restore "SharedAccountBackend.csproj" 

# Копируем весь код и собираем приложение
COPY . .
RUN dotnet publish "SharedAccountBackend.csproj" -c Release -o /app/publish

# Этап рантайма
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final 
WORKDIR /app
COPY --from=build /app/publish .

# Открываем порт и запускаем приложение
EXPOSE 80
ENTRYPOINT ["dotnet", "SharedAccountBackend.dll"]