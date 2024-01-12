import * as express from "express";

import UserController from "../controllers/user";
import AuthMiddleware from "../middlewares/auth";

const userRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                            START USER MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

userRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------- PRIVATE API ------------------------------ */

// Get/Update user profile
userRoute
  .route("/profile")
  .get(UserController.getProfile)
  .put(UserController.updateProfile);

// Get notification
userRoute.route("/notification/:id").get(UserController.getNotificationUser);

// Get owned motel room
userRoute.get("/motelRoom/list", UserController.getMotelRoomList);

userRoute.route("/motelRoom/room/:id").get(UserController.getMotelRoomByIdRoom);

// Get notification
userRoute.get("/notification/list", UserController.getNotificationList);

// recharge wallet
userRoute.route("/recharge").post(UserController.rechargeWallet);

userRoute.use(AuthMiddleware.isMaster);
userRoute.get("/admin/motelRoom/list", UserController.getMotelRoomListAdmin);

/* -------------------------------------------------------------------------- */
/*                             END USER MIDDLEWARE                            */
/* -------------------------------------------------------------------------- */

export default userRoute;
