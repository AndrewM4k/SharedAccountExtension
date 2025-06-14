using Microsoft.AspNetCore.SignalR;

namespace SharedAccountBackend.Hubs
{
    public class LogHub : Hub
    {
        public async Task JoinAdminGroup()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        }
    }
}
