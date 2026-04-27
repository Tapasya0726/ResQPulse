# resQpulse

Shared emergency response platform with:
- user interface
- ambulance interface
- hospital interface
- Express and Socket.IO backend
- MongoDB persistence

## Shared MongoDB Atlas setup

This project is designed to use one shared MongoDB Atlas database so the whole ResQPulse team sees the same live data across all three interfaces.

Use a MongoDB Atlas connection string in [server/.env](/Users/prathambhatapple.com/Desktop/Solution-Challenge-main/server/.env:1):

```env
PORT=5050
CLIENT_ORIGIN=http://localhost:3001
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_CLUSTER.mongodb.net/resqpulse?retryWrites=true&w=majority&appName=resQpulse
JWT_SECRET=replace_with_a_long_random_secret
DEV_OTP=1234
```

## Atlas steps

1. Create a MongoDB Atlas project and cluster.
2. Create a database user with read and write access.
3. In Atlas Network Access, allow your team IPs or temporarily allow `0.0.0.0/0` for development.
4. Copy the Atlas connection string and replace `MONGODB_URI` in [server/.env](/Users/prathambhatapple.com/Desktop/Solution-Challenge-main/server/.env:1).
5. Run `npm --prefix server run seed` once to create the shared ambulance and hospital data in Atlas.

If you want to move the current local ResQPulse data into Atlas instead of starting fresh, run:

```bash
cd /Users/prathambhatapple.com/Desktop/Solution-Challenge-main/server
TARGET_MONGODB_URI="your_atlas_uri" npm run migrate:atlas
```

Once that URI is in place, data from the user, ambulance, and hospital flows is stored in the shared Atlas database instead of a local MongoDB process.

## Scripts

### `npm run dev`

Starts the backend and frontend together.

### `npm start`

Starts the frontend only.

### `npm --prefix server run dev`

Starts the backend only.

### `npm --prefix server run seed`

Seeds the connected MongoDB database with ambulances and hospitals.

### `npm --prefix server run migrate:atlas`

Copies the local ResQPulse MongoDB data into the target Atlas database.

### `npm run build`

Builds the frontend for production.
