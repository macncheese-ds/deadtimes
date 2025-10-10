# Deadtimes - minimal ticket API

This folder contains a small Express backend and a minimal React frontend for managing "deadtimes" tickets (open/close flow). It mirrors the structure used in the `checklist` project (MySQL backend, Vite + React frontend).

Quick start (backend):

1. Open a terminal in this folder and install dependencies:

	cd deadtimes\backend; npm install

2. Create the database and table. You can run the SQL in `backend/init.sql` against your MySQL server (adjust credentials in `.env` or environment variables):

	- Create a `.env` file in `deadtimes/backend` with DB_HOST, DB_USER, DB_PASSWORD (and optional DB_NAME and DB_PORT).
	- Run the SQL file (for example using the mysql client):

	  mysql -u root -p < backend/init.sql

3. Start the backend API:

	cd deadtimes/backend; npm start

Backend API (examples):

- GET http://localhost:8700/api/deadtimes?status=open  -> list open tickets
- GET http://localhost:8700/api/deadtimes?status=closed -> list closed tickets
- GET http://localhost:8700/api/deadtimes/:id -> get ticket
- POST http://localhost:8700/api/deadtimes -> create ticket (body: descr, linea, nombre, num_empleado, ...)
- POST http://localhost:8700/api/deadtimes/:id/start -> record assignment (body: { tecnico })
- POST http://localhost:8700/api/deadtimes/:id/finish -> finalize (body: { causa, solucion, rate, piezas, e_ser })

Quick start (frontend):

1. Install frontend deps and run dev server:

	cd deadtimes\frontend; npm install; npm run dev

2. Open the browser at the port Vite reports (default 5174) and the app will call the backend at http://localhost:8700/api.

Notes and next steps:

- The backend expects a MySQL server and the `deadtimes` database created from `backend/init.sql`.
- The frontend is a minimal demo (create/list/start/finish). You can extend it to match the two-screen workflow from your spec.
- Consider adding authentication (GAFFET scan integration) and validation on both client and server for production use.
