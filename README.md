# JobTracker

A local web application for tracking job applications. It combines an ASP.NET Core API, a PostgreSQL database, and a React interface so you can keep application details and statuses in one place.

The interface is currently in Russian. The application is designed for local, single-user use and does not require paid services.

## Features

- Add, edit, and delete job applications.
- Track the status of each application: **Applied**, **Interview**, **Rejected**, or **Offer**.
- Filter applications by status and search by company or position.
- Optionally record the application date and a link to the vacancy.
- View summary counts and switch between light and dark themes.
- Keep data in PostgreSQL between application restarts.
- See an error message if an application cannot be saved or deleted.

## Tech stack

- **Backend:** C#, ASP.NET Core Web API, Entity Framework Core
- **Database:** PostgreSQL
- **Frontend:** React, JavaScript, Vite, CSS

## Project structure

```text
JobTracker/
├── JobTracker.Api/       # ASP.NET Core API and EF Core migrations
├── job-tracker-web/      # React/Vite frontend
├── .gitignore
└── README.md
```

## Requirements

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) compatible with the version of Vite used by the frontend
- [PostgreSQL](https://www.postgresql.org/download/) running locally
- The EF Core command-line tool, `dotnet-ef`, with a version compatible with the project's EF Core packages

The commands below use **Windows PowerShell**. On macOS or Linux, use `npm` instead of `npm.cmd` for frontend commands.

## Run locally

### 1. Create a database

Create an empty PostgreSQL database named `jobtracker`, for example using pgAdmin. You can choose a different database name if you use that name in your connection string.

### 2. Configure the API

Open a terminal in the repository root and go to the API folder:

```powershell
cd JobTracker.Api
```

Set your own connection string using .NET User Secrets. Replace `postgres` and `YOUR_PASSWORD` with your PostgreSQL username and password. If you use a different database name or port, change those values too.

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" 'Host=localhost;Port=5432;Database=jobtracker;Username=postgres;Password=YOUR_PASSWORD'
```

Do **not** commit your real password or connection string. User Secrets are stored outside the repository, but they are not encrypted. If your password contains connection-string special characters, quote or escape it according to PostgreSQL/Npgsql connection-string rules.

### 3. Apply the database migrations

If `dotnet-ef` is not installed, install a version compatible with the project's EF Core packages. For example, if the project uses EF Core 10.0.14:

```powershell
dotnet tool install --global dotnet-ef --version 10.0.14
```

If the tool is already installed, check its version with `dotnet ef --version` and update it if necessary. Then, from the `JobTracker.Api` folder, apply the migrations:

```powershell
dotnet ef database update -- --environment Development
```

### 4. Start the API

From the `JobTracker.Api` folder:

```powershell
dotnet run
```

Leave this terminal open. The local API normally listens at `http://localhost:5187`. You can check it at:

```text
http://localhost:5187/api/jobapplications
```

### 5. Start the frontend

Open a **second terminal** in the repository root:

```powershell
cd job-tracker-web
npm.cmd install
npm.cmd run dev
```

Open the **Local** address printed by Vite, normally `http://localhost:5173`. Keep both terminals open while using the application.

The frontend development server proxies `/api` requests to `http://localhost:5187`. If the API runs on a different port, update the proxy target in `job-tracker-web/vite.config.js`. If port 5173 is occupied, Vite may offer another local frontend port.

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/jobapplications` | List applications; optionally filter with `?status=Interview` |
| POST | `/api/jobapplications` | Create an application |
| PUT | `/api/jobapplications/{id}` | Update an application |
| DELETE | `/api/jobapplications/{id}` | Delete an application |

An application contains a company, position, and status, as well as an optional application date and vacancy URL. Dates use the `YYYY-MM-DD` format; vacancy links must be absolute HTTP or HTTPS URLs.

## Troubleshooting

- **The page cannot load applications:** make sure the API and PostgreSQL are running, and check the API address and the Vite proxy target.
- **Database connection or migration errors:** check the database name, port, username, and password in your local User Secrets. Do not share credentials when asking for help.
- **The API port is already in use:** stop the process using the port or choose another port and update the frontend proxy target.
- **Vite uses another port:** open the actual `Local` address printed in its terminal.

## Security note

This project has **no authentication or user accounts**. It is intended for local use, not for direct public internet deployment. Before exposing it online, add appropriate authentication, authorization, HTTPS, secure configuration, and database backups.

## Usage restrictions

The repository owner does not permit third parties to deploy or host this project online.
