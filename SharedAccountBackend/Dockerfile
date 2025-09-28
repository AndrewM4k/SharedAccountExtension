# Стадия сборки: используем образ с SDK
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Копируем файл проекта и восстанавливаем зависимости
COPY ["SharedAccountBackend.csproj", "."]
RUN dotnet restore "SharedAccountBackend.csproj"

# Копируем весь код и публикуем приложение
COPY . .
RUN dotnet publish "SharedAccountBackend.csproj" -c Release -o /app/publish

# Стадия рантайма: используем образ только с Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Копируем результат публикации из стадии сборки
COPY --from=build /app/publish .

# Указываем точку входа
ENTRYPOINT ["dotnet", "SharedAccountBackend.dll"]