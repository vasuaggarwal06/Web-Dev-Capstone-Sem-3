# AttendTrack – Student Attendance Management

Teachers mark class attendance. Students see their attendance percentage per subject and get shortage alerts.
Stack: **Express, Mongoose, dotenv, bcrypt, jsonwebtoken** (backend) and **React, react-router-dom, Fetch API, Context API** (frontend, built with Vite).

## Project structure

```
attendtrack/
├── server/
│   ├── config/        env.js (loads + validates .env), db.js (Mongo connection)
│   ├── models/        User.js, Course.js, Attendance.js
│   ├── controllers/   auth, user, course, attendance
│   ├── routes/        authRoutes, userRoutes, courseRoutes, attendanceRoutes
│   ├── middleware/    auth.js (protect + authorize), errorHandler.js
│   ├── utils/         ApiError, asyncHandler, tokens, dates
│   ├── seed/seed.js   demo data
│   ├── app.js / server.js
│   └── .env.example
├── client/            React app (pages, components, context, utils/api.js)
└── postman/           AttendTrack.postman_collection.json
```

## Setup

Requires Node 18+ and a running MongoDB (local or Atlas).

```bash
# 1. backend
cd server
cp .env.example .env      # then edit the two JWT secrets (and MONGO_URI if needed)
npm install
npm run seed              # optional demo data
npm run dev               # http://localhost:5000

# 2. frontend (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173  (proxies /api to :5000)
```

`.env` is listed in `.gitignore` and must never be committed. Only `.env.example` is tracked.


## Mandatory requirements checklist

| Requirement | Where |
|---|---|
| MVC backend structure | `server/{models,controllers,routes,middleware,config}` |
| `.env`, not committed | `server/.env.example`, `.gitignore`, `config/env.js` fails fast if a variable is missing |
| Register / login, bcrypt, JWT access + refresh | `controllers/authController.js`, `models/User.js` (bcrypt pre-save hook), `utils/tokens.js` |
| Protected route | `protect` middleware in `middleware/auth.js` (e.g. `GET /api/auth/me`, all course and attendance routes) |
| RBAC route | `authorize('admin')` / `authorize('teacher','admin')` / `authorize('student')`, e.g. `GET /api/users` is admin only |
| Mongoose validation + relationships | `Course.teacher → User`, `Course.students → [User]`, `Attendance.course/student/markedBy → Course/User` |
| Aggregation pipeline | `percentagePipeline` in `controllers/attendanceController.js` ($match, $group, $addFields, $lookup, $unwind, $project, $sort) |
| Index | `Attendance`: unique compound `{course, student, date}` and `{course, date}`; also indexes on `User.role`, `Course.teacher`, `Course.students` |
| Central error handling | `middleware/errorHandler.js` maps Mongoose validation (400), CastError (400), duplicate key (409), JWT errors (401), not found (404), other (500) |
| Postman collection | `postman/AttendTrack.postman_collection.json` |
| React: routing, controlled forms, Context, protected pages | `client/src` (`App.jsx`, `context/AuthContext.jsx`, `components/ProtectedRoute.jsx`, all forms controlled) |

## Feature notes

- **Roles:** public registration always creates a `student`. Admins create teachers and admins and can change roles.
- **Courses:** a course is a subject taught to a class or section. Teachers manage their own courses, and admins manage all of them. Students are enrolled by teachers or admins.
- **Bulk attendance:** `POST /api/attendance/bulk` saves a whole class for one day. Saving the same day again updates the records, and one record per student per course per day is enforced by the unique index.
- **Audit trail:** whenever a saved status changes (bulk re-save or `PUT /api/attendance/:id`), an entry with the old status, new status, editor, time and reason is pushed to `history`. Edits require a reason.
- **Percentage:** `present` and `late` count as attended, and `excused` days are left out of the total. Change this in `percentagePipeline`.
- **Shortage:** a student is in shortage when their percentage is below the course's `requiredPercentage` (default 75).
- **Tokens:** the access token lasts 15 minutes and the refresh token 7 days. Refresh tokens are stored hashed and rotated on every refresh. Reusing a rotated token revokes all of that user's sessions. The frontend refreshes automatically on a 401.

## API summary

| Method | Path | Access |
|---|---|---|
| POST | /api/auth/register, /login, /refresh | public |
| POST | /api/auth/logout, GET /api/auth/me | logged in |
| GET/POST | /api/users, PATCH /api/users/:id/role | admin |
| GET | /api/users/students | teacher, admin |
| GET | /api/courses, /api/courses/:id | logged in (scoped by role) |
| POST/PUT | /api/courses, /api/courses/:id | teacher, admin |
| DELETE | /api/courses/:id | admin |
| POST/DELETE | /api/courses/:id/enroll[/:studentId] | teacher, admin |
| POST | /api/attendance/bulk | teacher, admin |
| GET | /api/attendance/course/:courseId?date= | teacher, admin |
| PUT | /api/attendance/:id | teacher, admin |
| GET | /api/attendance/:id/history | teacher, admin |
| GET | /api/attendance/summary, /shortage | teacher, admin |
| GET | /api/attendance/me/summary, /me/records | student |

## Testing with Postman

1. Run `npm run seed`, then start the server.
2. Import `postman/AttendTrack.postman_collection.json`.
3. Run the collection with the Collection Runner (top to bottom). Tokens and IDs are stored in collection variables by test scripts.
4. Re-run `npm run seed` before each full run. The register request uses a timestamped email, which is fixed when the collection file is generated. If it returns 409, change that email.
