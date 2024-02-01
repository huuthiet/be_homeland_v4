import * as express from "express";

import AuthMiddleware from "../../middlewares/auth";

import JobController from "../../controllers/homeKey/job";

const jobRoute = express.Router();

/* -------------------------------------------------------------------------- */
/*                            START JOB MIDDLEWARE                            */
/* -------------------------------------------------------------------------- */

/* ------------------------------- PUBLIC APIS ------------------------------ */

/* ---------------------------- CHECK PERMISSION ---------------------------- */


jobRoute.use(AuthMiddleware.isAuthenticated);

/* ------------------------------ PRIVATE APIS ------------------------------ */

// Create job
jobRoute.route("/").post(JobController.createJob);

// Get job list
jobRoute.route("/list").get(JobController.getJobList);

// Delete job
jobRoute
  .route("/:id")
  .get(JobController.getJobById)
  .delete(JobController.deleteJobByUser);

// upload image for job
jobRoute.route("/:id/images").put(JobController.uploadImageForJob);
// upload image for job
jobRoute
  .route("/:id/images/profile")
  .put(JobController.uploadImageForJobProfile);

jobRoute.route("/:id/active").put(JobController.activeJob);

jobRoute
  .route("/:id/updateReturnRoomDate")
  .put(JobController.updateReturnRoomDate);

/* -------------------------------------------------------------------------- */
/*                             END JOB MIDDLEWARE                             */
/* -------------------------------------------------------------------------- */

export default jobRoute;
