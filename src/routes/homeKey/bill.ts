import * as express from "express";

import BillController from "../../controllers/homeKey/billControllers";
import AuthMiddleware from "../../middlewares/auth";

const billRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                         START MOTEL ROOM MIDDLEWARE                        */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

// Login
billRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------ PRIVATE APIS ------------------------------ */

// Create floor
billRoute.route("/:id").get(BillController.getBillDetail);
billRoute
  .route("/")
  .post(BillController.createBill)
  .get(BillController.getBillList);

/* -------------------------------------------------------------------------- */
/*                          END MOTEL ROOM MIDDLEWARE                         */
/* -------------------------------------------------------------------------- */

export default billRoute;
