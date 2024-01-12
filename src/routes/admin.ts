import * as express from "express";

import AuthMiddleware from "../middlewares/auth";

import JobController from "../controllers/homeKey/job";
import OrderController from "../controllers/homeKey/order";
import UserController from "../controllers/user";
import TransactionsController from "../controllers/homeKey/transactions";

const adminRoute = express.Router();


/* -------------------------------------------------------------------------- */
/*                            START USER MIDDLEWARE                           */
/* -------------------------------------------------------------------------- */

/* ---------------------------- CHECK PERMISSION ---------------------------- */

adminRoute.use(AuthMiddleware.isAuthenticated);
adminRoute.route("/order/:id").get(OrderController.getOrderByUser);
adminRoute
  .route("/transactions/:id")
  .post(TransactionsController.postTransactionPayment);
adminRoute.route("/bankname/user").get(TransactionsController.getBankNameUser);
adminRoute
  .route("/transactions/user")
  .get(TransactionsController.getTransactionUserPayment);

adminRoute.route("/homeKey/order/:id").get(OrderController.getOrderByAdmin);

adminRoute
  .route("/homeKey/order/list/host")
  .get(OrderController.getOrderListByHost);
adminRoute.route("/homeKey/job/list").get(JobController.getJobListByAdmin);

adminRoute.route("/homeKey/job/list").get(JobController.getJobListByAdmin);
adminRoute
  .route("/homeKey/job/user/list/:id")
  .get(JobController.getJobListByAdminWithUser);
adminRoute
  .route("/homeKey/job/:id")
  .get(JobController.getJobByAdmin)
  .delete(JobController.deleteJobByAdmin);
// Master
adminRoute.use(AuthMiddleware.isMaster);

/* ------------------------------- PRIVATE API ------------------------------ */

adminRoute
  .route("/resetPassword/:id")
  .get(TransactionsController.resetPassword);
adminRoute
  .route("/transactions/:id")
  .put(TransactionsController.putTransactionPayment);

adminRoute
  .route("/transactions")
  .get(TransactionsController.getTransactionPayment);

adminRoute.route("/user/:id").get(UserController.getProfileDeatail);
adminRoute
  .route("/user/:id/recharge")
  .put(UserController.rechargeWalletByAdmin);

adminRoute
  .route("/user")
  .get(UserController.getUserList)
  .delete(UserController.deleteUser);

adminRoute
  .route("/homeKey/order/list/admin")
  .get(OrderController.getOrderListByAdmin);

adminRoute
  .route("/homeKey/order/:id")
  .put(OrderController.editOrderByAdmin)
  .delete(OrderController.deleteOrderByAdmin);

adminRoute
  .route("/bank/:id")
  .post(TransactionsController.postAddBank)
  .get(TransactionsController.getBankDetail)
  .delete(TransactionsController.deleteBankName);

adminRoute.route("/bank").get(TransactionsController.getBank);
adminRoute.route("/bankname").get(TransactionsController.getBankName);

/* -------------------------------------------------------------------------- */
/*                             END USER MIDDLEWARE                            */
/* -------------------------------------------------------------------------- */

export default adminRoute;
