using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SharedAccountBackend.Migrations
{
    /// <inheritdoc />
    public partial class ActionModelChanged : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Action",
                table: "CopartActions");

            migrationBuilder.DropColumn(
                name: "BidAmount",
                table: "CopartActions");

            migrationBuilder.RenameColumn(
                name: "Details",
                table: "CopartActions",
                newName: "Commentary");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Commentary",
                table: "CopartActions",
                newName: "Details");

            migrationBuilder.AddColumn<string>(
                name: "Action",
                table: "CopartActions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BidAmount",
                table: "CopartActions",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
