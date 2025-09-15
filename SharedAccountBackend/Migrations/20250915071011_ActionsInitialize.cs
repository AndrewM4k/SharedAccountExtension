using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SharedAccountBackend.Migrations
{
    /// <inheritdoc />
    public partial class ActionsInitialize : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CopartActions_Users_UserId",
                table: "CopartActions");

            migrationBuilder.DropIndex(
                name: "IX_CopartActions_UserId",
                table: "CopartActions");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "CopartActions",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

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

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "CopartActions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "LotName",
                table: "CopartActions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PageUrl",
                table: "CopartActions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UserBidAmount",
                table: "CopartActions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UserId1",
                table: "CopartActions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PageViewActions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    ActionType = table.Column<string>(type: "text", nullable: false),
                    PageUrl = table.Column<string>(type: "text", nullable: false),
                    PageTitle = table.Column<string>(type: "text", nullable: false),
                    Referrer = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageViewActions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CopartActions_UserId1",
                table: "CopartActions",
                column: "UserId1");

            migrationBuilder.AddForeignKey(
                name: "FK_CopartActions_Users_UserId1",
                table: "CopartActions",
                column: "UserId1",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CopartActions_Users_UserId1",
                table: "CopartActions");

            migrationBuilder.DropTable(
                name: "PageViewActions");

            migrationBuilder.DropIndex(
                name: "IX_CopartActions_UserId1",
                table: "CopartActions");

            migrationBuilder.DropColumn(
                name: "Action",
                table: "CopartActions");

            migrationBuilder.DropColumn(
                name: "BidAmount",
                table: "CopartActions");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "CopartActions");

            migrationBuilder.DropColumn(
                name: "LotName",
                table: "CopartActions");

            migrationBuilder.DropColumn(
                name: "PageUrl",
                table: "CopartActions");

            migrationBuilder.DropColumn(
                name: "UserBidAmount",
                table: "CopartActions");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "CopartActions");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "CopartActions",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "IX_CopartActions_UserId",
                table: "CopartActions",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_CopartActions_Users_UserId",
                table: "CopartActions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
