# Deadtimes - minimal ticket API

This folder contains a small Express backend and a minimal React frontend for managing "deadtimes" tickets (open/close flow). It mirrors the structure used in the `checklist` project (MySQL backend, Vite + React frontend).

Quick start (backend):

1. Open a terminal in this folder and install dependencies:

	cd deadtimes\backend; npm install

2. Create the database and table. You can run the SQL in `backend/init.sql` against your MySQL server (adjust credentials in `.env` or environment variables):

	- Create a `.env` file in `deadtimes/backend` with DB_HOST, DB_USER, DB_PASSWORD (and optional DB_NAME and DB_PORT).
	- Run the SQL file (for example using the mysql client):

	  mysql -u root -p < backend/init.sql

3. Seed some users for demo (optional, since auth is removed from flows):

		curl -X POST http://localhost:8555/api/auth/register -H "Content-Type: application/json" -d '{"num_empleado": 12345, "nombre": "Juan Perez", "password": "pass123", "rol": "empleado"}'

4. Start the backend API:

		cd deadtimes/backend; npm start

Backend API (examples):

- GET http://localhost:8555/api/deadtimes?status=open  -> list open tickets
- GET http://localhost:8555/api/deadtimes?status=closed -> list closed tickets
- GET http://localhost:8555/api/deadtimes/:id -> get ticket
- POST http://localhost:8555/api/deadtimes -> create ticket (body: descr, linea, nombre, num_empleado, ...)
- POST http://localhost:8555/api/deadtimes/:id/start -> assign (body: { tecnico })
- POST http://localhost:8555/api/deadtimes/:id/finish -> finalize (body: { causa, solucion, rate, piezas, e_ser })
- PUT http://localhost:8555/api/deadtimes/:id -> update ticket

Quick start (frontend):

1. Install frontend deps and run dev server:

	cd deadtimes\frontend; npm install; npm run dev

2. Open the browser at the port Vite reports (default 5174). No login required, uses demo user.

Notes and next steps:

- The backend expects a MySQL server and the `deadtimes` database created from `backend/init.sql`.
- Authentication is optional; flows don't require extra credentials.
- Frontend uses Tailwind CSS for attractive design.
- Two screens: Home (list/create), HandleTicket (assign/edit/finish).
- Turno auto-calculated, deadtime = rate / piezas if piezas > 0.
- Add more dropdown options or validations as needed.
