import * as express from "express";

import EnergyController from "../../controllers/homeKey/energy";
import AuthMiddleware from "../../middlewares/auth";

const energyRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                            START ROOM MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC API ------------------------------- */

// Get room detail


//V1
// energyRoute.route("/device/dataV1/:id").get(EnergyController.getDeviceDataV1);
// energyRoute.route("/device/latestDataV1/:id").get(EnergyController.getLatestDeviceDataV1);
// energyRoute.route("/device/currentDayDataPerHourV1/:id")
//                     .get(EnergyController.getCurrentDayDataPerHourV1);

// energyRoute.route("/device/currentMonDataPerDayV1/:id")
//                     .get(EnergyController.getCurrentMonDataPerDayV1);

// ----------------------BACKUP----------------------------------------
energyRoute.route("/devices/backUpData/:startTime/:endTime")
                    .get(EnergyController.backUpDataPerDay);             

energyRoute.route("/devices/clearData/:startTime/:endTime")
                    .get(EnergyController.clearData);   
// V2

/* ---------------------------- CHECK PERMISSION ---------------------------- */
/* ------------------------------ PRIVATE APIS ------------------------------ */
// Login
energyRoute.use(AuthMiddleware.isAuthenticated);

// Host
// energyRoute.use(AuthMiddleware.isHost);
energyRoute.route("/device/latestData/:id").get(EnergyController.latestData);
energyRoute.route("/device/currentDayDataPerHour/:id")
                    .get(EnergyController.getCurrentDayDataPerHour);

energyRoute.route("/device/currentMonDataPerDay/:id/:year/:month")
                    .get(EnergyController.getCurrentMonDataPerDay);

energyRoute.route("/device/getNameRoomById/:id")
                    .get(EnergyController.getNameRoomById);                  

// Master                    
energyRoute.use(AuthMiddleware.isMaster);                  
energyRoute.route("/devices").get(EnergyController.getAllDevice);



/* -------------------------------------------------------------------------- */
/*                             END ROOM MIDDLEWARE                            */
/* -------------------------------------------------------------------------- */

export default energyRoute;
