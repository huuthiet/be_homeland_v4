import * as express from "express";

import EnergyController from "../../controllers/homeKey/energy";
import AuthMiddleware from "../../middlewares/auth";

const energyRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                            START ROOM MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC API ------------------------------- */

// Get room detail
// roomRoute.route("/:id").get(RoomController.getRoomDetail);
energyRoute.route("/devices").get(EnergyController.getAllDevice);
energyRoute.route("/device/data/:id").get(EnergyController.getDeviceData);
energyRoute.route("/device/latestData/:id").get(EnergyController.getLatestDeviceData);
energyRoute.route("/device/currentDayDataPerHour/:id/:startTime/:endTime")
                    .get(EnergyController.getCurrentDayDataPerHour);

energyRoute.route("/device/currentMonDataPerDay/:id/:startTime/:endTime")
                    .get(EnergyController.getCurrentMonDataPerDay);

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
// roomRoute.use(AuthMiddleware.isAuthenticated);

// Host
// roomRoute.use(AuthMiddleware.isHost);

/* ------------------------------ PRIVATE APIS ------------------------------ */

// Create room
// roomRoute.route("/").post(RoomController.createRoom);


/* -------------------------------------------------------------------------- */
/*                             END ROOM MIDDLEWARE                            */
/* -------------------------------------------------------------------------- */

export default energyRoute;
