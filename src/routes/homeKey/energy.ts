import * as express from "express";

import EnergyController from "../../controllers/homeKey/energy";
import AuthMiddleware from "../../middlewares/auth";

const energyRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                            START ROOM MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC API ------------------------------- */

// Get room detail
energyRoute.route("/devices").get(EnergyController.getAllDevice);

//V1
energyRoute.route("/device/dataV1/:id").get(EnergyController.getDeviceDataV1);
energyRoute.route("/device/latestDataV1/:id").get(EnergyController.getLatestDeviceDataV1);
energyRoute.route("/device/currentDayDataPerHourV1/:id")
                    .get(EnergyController.getCurrentDayDataPerHourV1);

energyRoute.route("/device/currentMonDataPerDayV1/:id")
                    .get(EnergyController.getCurrentMonDataPerDayV1);

// ----------------------BACKUP----------------------------------------
energyRoute.route("/devices/backUpData/:startTime/:endTime")
                    .get(EnergyController.backUpDataPerDay);             


// V2
// energyRoute.route("/device/data/:id").get(EnergyController.getDeviceData);
// energyRoute.route("/device/latestData/:id").get(EnergyController.getLatestDeviceDataV1);
energyRoute.route("/device/currentDayDataPerHour/:id")
                    .get(EnergyController.getCurrentDayDataPerHour);

energyRoute.route("/device/currentMonDataPerDay/:id/:year/:month")
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
