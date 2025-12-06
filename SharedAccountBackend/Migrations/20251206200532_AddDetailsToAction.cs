using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SharedAccountBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddDetailsToAction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Details",
                table: "CopartActions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Details",
                table: "CopartActions");
        }
    }
}
