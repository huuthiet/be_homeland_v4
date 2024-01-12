import { NextFunction, Request, Response } from "express";
import * as moment from "moment";
import * as mongoose from "mongoose";

import { helpers } from "../../utils";

import ImageService from "../../services/image";
import HttpResponse from "../../services/response";
import RoomController from "./room";
import NotificationController from "./notification";
import * as lodash from "lodash";
import cloudinary from "../../utils/cloudinary";

export default class JobController {
  /**
   * @swagger
   * tags:
   *   - name: Job
   *     description: Job Control APIs
   */

  /**
   * @swagger
   * /v1/homeKey/job:
   *   post:
   *     description: Edit room by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: roomId
   *         in: formData
   *         type: string
   *         description: roomId
   *       - name: checkInTime
   *         in: formData
   *         type: string
   *         description: mm/dd/yyyy
   *       - name: fullName
   *         in: formData
   *         type: string
   *         description: fullName
   *       - name: phoneNumber
   *         in: formData
   *         type: string
   *         description: phoneNumber
   *       - name: price
   *         in: formData
   *         type: string
   *         description: price
   *       - name: bail
   *         in: formData
   *         type: string
   *         description: bail
   *       - name: total
   *         in: formData
   *         type: string
   *         description: total
   *       - name: deposit
   *         in: formData
   *         type: string
   *         description: deposit
   *       - name: afterCheckInCost
   *         in: formData
   *         type: string
   *         description: afterCheckInCost
   *       - name: afterCheckInCost
   *         in: formData
   *         type: string
   *         description: afterCheckInCost
   *       - name: rentalPeriod
   *         in: formData
   *         type: string
   *         description: rentalPeriod
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async createJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        room: roomModel,
        job: jobModel,
        user: userModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        order: orderModel,
      } = global.mongoModel;

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      let { body: data } = req;

      // Check exist room rented by phone number
      const job = await jobModel
        .findOne({ phoneNumber: data.phoneNumber })
        .lean()
        .exec();

      if (job) {
        if (job.isCompleted === true) {
          return HttpResponse.returnBadRequestResponse(
            res,
            "Số điện thoại đã được thuê"
          );
        }

        await JobController.deleteJob(job._id, req["userProfile"]);
      }

      const roomData = await RoomController.getRoomById(data.roomId);

      if (roomData && roomData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          roomData.errors[0].errorMessage
        );
      }

      if (!roomData.isCompleted) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa hoàn thành"
        );
      }

      if (roomData.status !== "available") {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng chưa Đã Được Đặt"
        );
      }
      const dayID = moment(roomData.availableDate).format("DD/MM/YYYY");

      if (
        moment(data.checkInTime, "MM-DD-YYYY").isBefore(
          moment(dayID, "MM-DD-YYYY")
        )
      ) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Thời gian bắt đầu thuê nhỏ hơn ngày hiện tại"
        );
      }
      const myDateOld = data.checkInTime;

      const dateOld = myDateOld.split("/")[0];
      const monthOld = myDateOld.split("/")[1];
      const yearOld = myDateOld.split("/")[2];

      const stringDate = `${dateOld}-${monthOld}-${yearOld}`;
      let date = new Date(
        stringDate.replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3")
      );
      const myDateNew = date;
      data.checkInTime = myDateNew;
      data.room = roomData._id;
      data.user = req["userId"];

      const floorData = await floorModel
        .findOne({ rooms: data.roomId })
        .lean()
        .exec();

      if (!floorData) {
        return HttpResponse.returnBadRequestResponse(res, "Tầng không hợp lệ");
      }

      const motelRoomData = await motelRoomModel
        .findOne({ floors: floorData._id })
        .lean()
        .exec();

      if (!motelRoomData) {
        return HttpResponse.returnBadRequestResponse(res, "Phòng không hợp lệ");
      }
      let resData = await jobModel.create(data);
      let userUpdateData = {
        $addToSet: {
          jobs: resData._id,
        },
      };

      if (
        req["userProfile"].phoneNumber.number ===
        helpers.stripeZeroOut(data.phoneNumber)
      ) {
        userUpdateData["currentJob"] = resData._id;
        userUpdateData["room"] = roomData._id;
      }

      await userModel
        .findOneAndUpdate({ _id: req["userId"] }, userUpdateData, { new: true })
        .exec();

      await floorModel
        .findOneAndUpdate(
          { _id: floorData._id },
          {
            $inc: {
              availableRoom: -1,
              depositedRoom: 1,
            },
          }
        )
        .exec();
      await motelRoomModel
        .findOneAndUpdate(
          { _id: floorData._id },
          {
            $inc: {
              availableRoom: -1,
              depositedRoom: 1,
            },
          }
        )
        .exec();

      await NotificationController.createNotification({
        title: "Xác nhận đặt cọc",
        content: "Bạn đã đặt phòng thành công",
        user: req["userId"],
      });

      const orderData = await orderModel.create({
        user: req["userId"],
        job: resData._id,
        isCompleted: false,
        description: `Tiền cọc phòng tháng ${myDateOld.split("/")[1]}/${
          myDateOld.split("/")[2]
        }`,
        amount: data.deposit,
        type: "deposit",
      });

      resData = await jobModel.findOneAndUpdate(
        { _id: resData._id },
        {
          isCompleted: orderData.isCompleted,
          $addToSet: { orders: orderData._id },
          currentOrder: orderData._id,
        },
        { new: true }
      );

      // Check 7 days after check in time
      await global.agendaInstance.agenda.schedule(
        moment(resData.checkInTime)
          .add(7, "days")
          .toDate(),
        "CheckJobStatus",
        { jobId: resData._id }
      );

      return HttpResponse.returnSuccessResponse(
        res,
        await JobController.getJob(resData._id)
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/list:
   *   get:
   *     description: Get list job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: keyword
   *         in: query
   *         type:  string
   *         description: Keyword to find job
   *       - name: sortBy
   *         in: query
   *         type:  string
   *         description: Sort By
   *         enum:
   *              - createdAt
   *              - updatedAt
   *       - name: sortType
   *         in: query
   *         type:  string
   *         description: Sort Type
   *         enum:
   *              - ascending
   *              - descending
   *       - name: size
   *         in: query
   *         description: Number of user returned
   *         type:  integer
   *         default: 20
   *       - name: page
   *         in: query
   *         default: 0
   *         description: Current page
   *         type:  integer
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async getJobList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      let { sortBy, size, page, keyword } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            isDeleted: 0,
          },
        },
        {
          $match: {
            user: req["userId"],
            isCompleted: true,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      const resData = await jobModel.paginate(size, page, condition);

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/homeKey/job/list:
   *   get:
   *     description: Get list job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: keyword
   *         in: query
   *         type:  string
   *         description: Keyword to find job
   *       - name: sortBy
   *         in: query
   *         type:  string
   *         description: Sort By
   *         enum:
   *              - createdAt
   *              - updatedAt
   *       - name: sortType
   *         in: query
   *         type:  string
   *         description: Sort Type
   *         enum:
   *              - ascending
   *              - descending
   *       - name: size
   *         in: query
   *         description: Number of user returned
   *         type:  integer
   *         default: 20
   *       - name: page
   *         in: query
   *         default: 0
   *         description: Current page
   *         type:  integer
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async getJobListByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      let { sortBy, size, page, keyword } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            isDeleted: 0,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      const resData = await jobModel.paginate(size, page, condition);

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getJobListByAdminWithUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const id = req.params.id;
      // Init models
      const { order: OrderModel, user: UserModel } = global.mongoModel;
      let { size, page } = req.query;
      let condition;
      condition = [
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
        {
          $project: {
            isDeleted: 0,
            "user.password": 0,
            "user.token": 0,
            "user.isDeleted": 0,
            "user._v": 0,
          },
        },
      ];
      const resData = await OrderModel.paginate(size, page, condition);
      if (!resData) {
        return HttpResponse.returnBadRequestResponse(res, "order.not.exist");
      }

      const dataRes = [];
      for (let i = 0; i < resData.data.length; i++) {
        if (resData.data[i].user._id == req.params.id) {
          const jobData = await JobController.getJob(resData.data[i].job._id);
          if (jobData) {
            resData.data[i].room = jobData.room;
          } else {
            resData.data[i].room = {};
          }
          dataRes.push(resData.data[i]);
        }
      }
      if (dataRes.length > 0) {
        resData.data = dataRes;
      } else {
        resData.data = [];
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}:
   *   delete:
   *     description: Delete job by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: jobId
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async deleteJobByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        job: jobModel,
        user: userModel,
        order: orderModel,
      } = global.mongoModel;

      const jobData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (jobData && jobData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          jobData.errors[0].errorMessage
        );
      }

      await NotificationController.createNotification({
        title: "Xác nhận hủy cọc",
        content: "Bạn đã hủy cọc phòng thành công",
        user: req["userId"],
      });

      let resData = await jobModel
        .remove({ _id: req.params.id })
        .lean()
        .exec();

      await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

      await roomModel
        .findOneAndUpdate(
          { _id: jobData.room },
          {
            status: "available",
            $unset: { rentedBy: 1 },
          }
        )
        .exec();

      let floorData = await floorModel
        .findOne({ rooms: jobData.room._id })
        .populate("rooms")
        .lean()
        .exec();
      const roomGroup = lodash.groupBy(floorData.rooms, (room) => {
        return room.status;
      });

      await floorModel
        .findOneAndUpdate(
          { _id: floorData._id },
          {
            availableRoom: roomGroup["available"]
              ? roomGroup["available"].length
              : 0,
            rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
            depositedRoom: roomGroup["deposited"]
              ? roomGroup["deposited"].length
              : 0,
          }
        )
        .exec();

      let motelRoomData = await motelRoomModel
        .findOne({ floors: floorData._id })
        .populate("floors")
        .lean()
        .exec();

      let updateData = {
        availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
        rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
        depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
      };

      await motelRoomModel
        .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
        .exec();

      let userUpdateData = {
        $pull: {
          jobs: jobData._id,
        },
      };

      if (
        req["userProfile"].phoneNumber.number ===
        helpers.stripeZeroOut(jobData.phoneNumber)
      ) {
        userUpdateData["$unset"] = { room: 1, currentJob: 1 };
      }

      await userModel
        .findOneAndUpdate({ _id: req["userId"] }, userUpdateData, { new: true })
        .exec();

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/homeKey/job/{id}:
   *   delete:
   *     description: Delete job by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: jobId
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async deleteJobByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
        job: jobModel,
        user: userModel,
        order: orderModel,
      } = global.mongoModel;

      const jobData = await JobController.getJob(req.params.id);

      if (!jobData) {
        return HttpResponse.returnBadRequestResponse(res, "job.not.exist");
      }

      await NotificationController.createNotification({
        title: "Xác nhận hủy cọc",
        content: "Bạn đã hủy cọc phòng thành công",
        user: req["userId"],
      });

      let resData = await jobModel
        .remove({ _id: req.params.id })
        .lean()
        .exec();

      await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

      await roomModel
        .findOneAndUpdate(
          { _id: jobData.room },
          {
            status: "available",
            $unset: { rentedBy: 1 },
          },
          { new: true }
        )
        .exec();

      let floorData = await floorModel
        .findOne({ rooms: jobData.room._id })
        .populate("rooms")
        .lean()
        .exec();
      const roomGroup = lodash.groupBy(floorData.rooms, (room) => {
        return room.status;
      });

      await floorModel
        .findOneAndUpdate(
          { _id: floorData._id },
          {
            availableRoom: roomGroup["available"]
              ? roomGroup["available"].length
              : 0,
            rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
            depositedRoom: roomGroup["deposited"]
              ? roomGroup["deposited"].length
              : 0,
          }
        )
        .exec();

      let motelRoomData = await motelRoomModel
        .findOne({ floors: floorData._id })
        .populate("floors")
        .lean()
        .exec();

      let updateData = {
        availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
        rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
        depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
      };

      await motelRoomModel
        .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
        .exec();

      let userUpdateData = {
        $pull: {
          jobs: jobData._id,
        },
      };

      const userData = await userModel
        .findOne({ _id: jobData.user })
        .lean()
        .exec();

      if (
        userData.phoneNumber.number ===
        helpers.stripeZeroOut(jobData.phoneNumber)
      ) {
        userUpdateData["$unset"] = { room: 1, currentJob: 1 };
      }

      await userModel
        .findOneAndUpdate({ _id: jobData.user }, userUpdateData, { new: true })
        .exec();

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}:
   *   get:
   *     description: Get job by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: jobId
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async getJobById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }
      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/homeKey/job/{id}:
   *   get:
   *     description: Get job by id
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: jobId
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async getJobByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let resData = await JobController.getJob(req.params.id);

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}/images:
   *   put:
   *     description: Upload Image For Job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required:  true
   *         type: string
   *         description: jobId
   *       - name: file
   *         in: formData
   *         required:  true
   *         type:  file
   *         description: image lists
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async uploadImageForJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const data = req.body;
      let images = [];

      for (let i = 0; i < data.length; i++) {
        images.push(data[i]);
      }

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      if (!resData.isCompleted) {
        return HttpResponse.returnBadRequestResponse(res, "Chưa hoàn thành");
      }
      const { image: imageModel } = global.mongoModel;

      const { job: jobModel } = global.mongoModel;
      let rs = null;

      const dataIMG_font = await imageModel.findOne({ _id: images[0] });
      const dataIMG_end = await imageModel.findOne({ _id: images[1] });

      const dataIMG = [];
      dataIMG.push(dataIMG_font);
      dataIMG.push(dataIMG_end);

      rs = await jobModel
        .findOneAndUpdate({ _id: req.params.id }, { images: dataIMG })
        .lean()
        .exec();

      return HttpResponse.returnSuccessResponse(
        res,
        JobController.getJob(req.params.id)
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}/active:
   *   put:
   *     description: Upload Image For Job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required:  true
   *         type: string
   *         description: jobId
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async activeJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        order: orderModel,
        user: userModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      if (resData.status !== "pendingActivated") {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng đang chờ kích hoạt"
        );
      }

      if (moment().isBefore(resData.checkInTime)) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng đặt trước thời gian"
        );
      }

      if (resData.isActived) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Phòng đã được kích hoạt"
        );
      }

      //TODO: turn on IoT devices

      await roomModel
        .findOneAndUpdate({ _id: resData.room._id }, { status: "rented" })
        .lean()
        .exec();

      await NotificationController.createNotification({
        title: "Thông báo đóng tiền phòng",
        content: "Vui lòng thanh toán tiền trước cuối tháng.",
        user: resData.user,
      });

      const checkInTime = moment(resData.checkInTime)
        .utcOffset(420)
        .format("MM/DD/YYYY");

      const orderData = await orderModel.create({
        user: resData.user,
        job: resData._id,
        isCompleted: false,
        description: `Tiền phòng tháng ${checkInTime.split("/")[0]}/${
          checkInTime.split("/")[2]
        }`,
        amount: resData.afterCheckInCost,
        type: "afterCheckInCost",
      });

      resData = await jobModel
        .findOneAndUpdate(
          { _id: resData._id },
          {
            $addToSet: { orders: orderData._id },
            currentOrder: orderData._id,
            isActived: true,
            status: "afterCheckInCostPaymentCompleted",
          },
          { new: true }
        )
        .populate("rooms")
        .lean()
        .exec();

      let floorData = await floorModel
        .findOne({ rooms: resData.room._id })
        .populate("rooms")
        .lean()
        .exec();
      const roomGroup = lodash.groupBy(floorData.rooms, (room) => {
        return room.status;
      });

      await floorModel
        .findOneAndUpdate(
          { _id: floorData._id },
          {
            availableRoom: roomGroup["available"]
              ? roomGroup["available"].length
              : 0,
            rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
            depositedRoom: roomGroup["deposited"]
              ? roomGroup["deposited"].length
              : 0,
          }
        )
        .exec();

      let motelRoomData = await motelRoomModel
        .findOne({ floors: floorData._id })
        .populate("floors")
        .lean()
        .exec();

      let updateData = {
        availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
        rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
        depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
      };

      await motelRoomModel
        .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
        .exec();

      await global.agendaInstance.agenda.schedule(
        moment(resData.checkInTime)
          .add(5, "days")
          .toDate(),
        "CheckOrderStatus",
        { orderId: orderData._id }
      );

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/motelRoom/{id}/jobList:
   *   get:
   *     description: Get job list by owner
   *     tags: [MotelRoom]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: floor id
   *       - name: keyword
   *         in: query
   *         type:  string
   *         description: Keyword to find job
   *       - name: sortBy
   *         in: query
   *         type:  string
   *         description: Sort By
   *         enum:
   *              - createdAt
   *              - updatedAt
   *       - name: sortType
   *         in: query
   *         type:  string
   *         description: Sort Type
   *         enum:
   *              - ascending
   *              - descending
   *       - name: size
   *         in: query
   *         description: Number of job returned
   *         type:  integer
   *         default: 20
   *       - name: page
   *         in: query
   *         default: 0
   *         description: Current page
   *         type:  integer
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async getJobListByOwnerAndMotelId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            motelRoom: { $exists: true },
            "motelRoom.owner": req["userId"],
            "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getJobListByMotelId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      const { order: orderModel } = global.mongoModel;
      const { user: userModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            motelRoom: { $exists: true },
            // "motelRoom.owner": req["userId"],
            "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
            createdAt: {
              $gte: new Date(startDate.toString()), // lớn hơn
              $lt: new Date(endDate.toString()), // nhỏ hơn
            },
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        // delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
        const arrTemp = [];
        for (let j = 0; j < resData.data[i].orders.length; j++) {
          const idOrder = resData.data[i].orders[j];
          const orderData = await orderModel
            .findOne({ _id: idOrder })
            .lean()
            .exec();
          arrTemp.push(orderData);
        }
        const userId = resData.data[i].user;
        let resProfile = await userModel
          .findOne({ _id: userId, isDeleted: false }, { password: 0, token: 0 })
          .populate("avatar identityCards backId frontId")
          .lean()
          .exec();

        resData.data[i].orderData = arrTemp;
        resData.data[i].user = resProfile;
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getJobListByOwnerN(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      const { order: orderModel } = global.mongoModel;
      const { user: userModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            motelRoom: { $exists: true },
            "motelRoom.owner": req["userId"],
            // "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
            createdAt: {
              $gte: new Date(startDate.toString()), // lớn hơn
              $lt: new Date(endDate.toString()), // nhỏ hơn
            },
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        // delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
        const arrTemp = [];
        for (let j = 0; j < resData.data[i].orders.length; j++) {
          const idOrder = resData.data[i].orders[j];
          const orderData = await orderModel
            .findOne({ _id: idOrder })
            .lean()
            .exec();
          arrTemp.push(orderData);
        }
        const userId = resData.data[i].user;
        let resProfile = await userModel
          .findOne({ _id: userId, isDeleted: false }, { password: 0, token: 0 })
          .populate("avatar identityCards backId frontId")
          .lean()
          .exec();

        resData.data[i].orderData = arrTemp;
        resData.data[i].user = resProfile;
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  static async getJobListByOwner(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      const { order: orderModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            motelRoom: { $exists: true },
            "motelRoom.owner": req["userId"],
            // "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
        const arrTemp = [];
        for (let j = 0; j < resData.data[i].orders.length; j++) {
          const idOrder = resData.data[i].orders[j];
          const orderData = await orderModel
            .findOne({ _id: idOrder })
            .lean()
            .exec();
          arrTemp.push(orderData);
        }
        resData.data[i].orderData = arrTemp;
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }
  static async getJobListAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init user model`
      const { job: jobModel } = global.mongoModel;
      let { sortBy, role, size, page, keyword, dateStart, dateEnd } = req.query;
      const sortType = req.query.sortType === "ascending" ? 1 : -1;
      let condition, sort;

      const dateStartString = moment(
        dateStart.toString(),
        "YYYY-MM-DD"
      ).toDate();
      const dateEndString = moment(dateEnd.toString(), "YYYY-MM-DD").toDate();

      condition = [
        {
          $lookup: {
            from: "floors",
            localField: "room",
            foreignField: "rooms",
            as: "floor",
          },
        },
        { $unwind: { path: "$floor", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "floor._id",
            foreignField: "floors",
            as: "motelRoom",
          },
        },
        { $unwind: { path: "$motelRoom", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "images",
            localField: "images",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "currentOrder",
            foreignField: "_id",
            as: "currentOrder",
          },
        },
        {
          $unwind: { path: "$currentOrder", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "room",
            foreignField: "_id",
            as: "room",
          },
        },
        { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "motelRooms",
            localField: "motelRooms",
            foreignField: "motelRoom._id",
            as: "motelRooms",
          },
        },
        {
          $match: {
            motelRoom: { $exists: true },
            // "motelRoom.owner": req.params.id,
            // "motelRoom._id": mongoose.Types.ObjectId(req.params.id),
            isCompleted: true,
            createdAt: {
              $gte: dateStartString, // lớn hơn
              $lt: dateEndString, // nhỏ hơn
            },
          },
        },
      ];

      if (sortBy && sortType) {
        switch (sortBy) {
          case "createdAt": {
            sort = { createdAt: sortType };
            break;
          }
          case "updatedAt": {
            sort = { updatedAt: sortType };
            break;
          }
        }
        condition.push({ $sort: sort });
      }

      let resData = await jobModel.paginate(size, page, condition);

      for (let i = 0; i < resData.data.length; i++) {
        delete resData.data[i].motelRoom;
        if (resData.data[i].images) {
          resData.data[i].images = helpers.getImageUrl(
            resData.data[i].images,
            true
          );
        }
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/room/{id}/job:
   *   get:
   *     description: Return job by roomid
   *     tags: [Room]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         type: string
   *         description: room id
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *          - auth: []
   */

  static async getJobByRoomId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      //Init models
      const { job: jobModel } = global.mongoModel;

      let resData = await RoomController.getRoomById(req.params.id);

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      const jobData = await jobModel
        .findOne({ room: resData._id })
        .lean()
        .exec();

      if (!jobData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "phòng đặt không tồn tại"
        );
      }

      resData = await JobController.getJob(jobData._id);

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/job/{id}/updateReturnRoomDate:
   *   put:
   *     description: Upload Image For Job
   *     tags: [Job]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         required:  true
   *         type: string
   *         description: jobId
   *       - name: returnRoomDate
   *         in: formData
   *         required:  true
   *         type: string
   *         description: MM/DD/YYYY
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Invalid request params
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Resource not found
   *     security:
   *       - auth: []
   */

  static async updateReturnRoomDate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        order: orderModel,
        user: userModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;

      const imageService = new ImageService("local", true);

      // Process form data
      const processDataInfo = await imageService.processFormData(req, res);

      if (processDataInfo && processDataInfo.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          processDataInfo.error
        );
      }

      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      if (
        resData.isUpdatedReturnRoomDate &&
        moment().isSameOrAfter(moment(resData.returnRoomDate))
      ) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "phòng đặt không cập nhật được thời gian"
        );
      }

      resData = await JobController.updateJob(req.params.id, {
        returnRoomDate: moment(req.body.returnRoomDate),
        isUpdatedReturnRoomDate: true,
      });

      await roomModel
        .findOneAndUpdate(
          { _id: resData.room._id },
          { availableDate: moment(req.body.returnRoomDate).add(1, "days") }
        )
        .exec();

      await global.agendaInstance.agenda.cancel({
        name: "ChangeRoomStatus",
        "data.jobId": resData.room._id,
      });
      await global.agendaInstance.agenda.schedule(
        moment(req.body.returnRoomDate)
          .startOf("day")
          .toDate(),
        "ChangeRoomStatus",
        {
          jobId: resData.room._id,
          type: "changeStatus",
          status: "available",
        }
      );

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  // Get job by id
  static async getJob(jobId: any, condition?: any): Promise<any> {
    // Init models
    const {
      room: roomModel,
      job: jobModel,
      floor: floorModel,
      motelRoom: motelRoomModel,
      user: userModel,
    } = global.mongoModel;

    let resData = await jobModel
      .findOne({ _id: jobId, ...condition })
      .populate("room orders order images currentOrder")
      .lean()
      .exec();

    if (!resData) {
      return HttpResponse.returnErrorWithMessage("job.not.exist");
    }

    let userData = await userModel
      .findOne({ _id: resData.user._id })
      .lean()
      .exec();
    if (userData) {
      const userRes = {
        _id: userData._id,
        name: `${userData.lastName} ${userData.firstName}`,
      };

      resData["user"] = userRes;
    }

    const floorData = await floorModel
      .findOne({ rooms: resData.room._id })
      .lean()
      .exec();

    const motelRoomData = await motelRoomModel
      .findOne({ floors: floorData._id })
      .lean()
      .exec();

    resData["motelRoom"] = motelRoomData;

    if (resData.images) {
      resData.images = await helpers.getImageUrl(resData.images, true);
    }

    helpers.changeTimeZone(resData);

    return resData;
  }

  // Update job by id
  static async updateJob(jobId: any, data: any): Promise<any> {
    // Init models
    const { job: jobModel } = global.mongoModel;

    // Update job data
    await jobModel
      .findOneAndUpdate({ _id: jobId }, data)
      .populate("room orders order images")
      .lean()
      .exec();

    return JobController.getJob(jobId);
  }

  static async uploadImageForJobProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const data = req.body;

      let resData = await JobController.getJob(req.params.id, {
        user: mongoose.Types.ObjectId(req["userId"]),
      });

      if (resData && resData.error) {
        return HttpResponse.returnBadRequestResponse(
          res,
          resData.errors[0].errorMessage
        );
      }

      if (!resData.isCompleted) {
        return HttpResponse.returnBadRequestResponse(res, "Chưa hoàn thành");
      }
      const { image: imageModel } = global.mongoModel;

      const { job: jobModel } = global.mongoModel;
      const { user: userModel } = global.mongoModel;

      let rs = null;

      let resProfile = await userModel
        .findOne(
          { _id: req["userId"], isDeleted: false },
          { password: 0, token: 0 }
        )
        .populate("avatar identityCards backId frontId")
        .lean()
        .exec();

      const dataIMG_font = await imageModel.findOne({
        _id: resProfile.frontId._id,
      });
      const dataIMG_end = await imageModel.findOne({
        _id: resProfile.backId._id,
      });

      const dataIMG = [];
      dataIMG.push(dataIMG_font);
      dataIMG.push(dataIMG_end);

      rs = await jobModel
        .findOneAndUpdate({ _id: req.params.id }, { images: dataIMG })
        .lean()
        .exec();

      return HttpResponse.returnSuccessResponse(
        res,
        JobController.getJob(req.params.id)
      );
    } catch (e) {
      next(e);
    }
  }

  // Delete job by id
  static async deleteJob(jobId: any, userProfile: any): Promise<any> {
    // Init models
    const {
      room: roomModel,
      floor: floorModel,
      motelRoom: motelRoomModel,
      job: jobModel,
      user: userModel,
      order: orderModel,
    } = global.mongoModel;

    const jobData = await JobController.getJob(jobId, {
      user: mongoose.Types.ObjectId(userProfile._id),
    });

    if (jobData && jobData.error) {
      return jobData;
    }

    let resData = await jobModel
      .remove({ _id: jobId })
      .lean()
      .exec();

    await orderModel.remove({ _id: { $in: jobData.orders } }).exec();

    await roomModel
      .findOneAndUpdate(
        { _id: jobData.room },
        {
          status: "available",
          $unset: { rentedBy: 1 },
        }
      )
      .exec();

    let floorData = await floorModel
      .findOne({ rooms: jobData.room._id })
      .populate("rooms")
      .lean()
      .exec();
    const roomGroup = lodash.groupBy(floorData.rooms, (room) => {
      return room.status;
    });

    await floorModel
      .findOneAndUpdate(
        { _id: floorData._id },
        {
          availableRoom: roomGroup["available"]
            ? roomGroup["available"].length
            : 0,
          rentedRoom: roomGroup["rented"] ? roomGroup["rented"].length : 0,
          depositedRoom: roomGroup["deposited"]
            ? roomGroup["deposited"].length
            : 0,
        }
      )
      .exec();

    let motelRoomData = await motelRoomModel
      .findOne({ floors: floorData._id })
      .populate("floors")
      .lean()
      .exec();

    let updateData = {
      availableRoom: lodash.sumBy(motelRoomData.floors, "availableRoom"),
      rentedRoom: lodash.sumBy(motelRoomData.floors, "rentedRoom"),
      depositedRoom: lodash.sumBy(motelRoomData.floors, "depositedRoom"),
    };

    await motelRoomModel
      .findOneAndUpdate({ _id: motelRoomData._id }, updateData)
      .exec();

    let userUpdateData = {
      $pull: {
        jobs: jobData._id,
      },
    };

    if (
      userProfile.phoneNumber.number ===
      helpers.stripeZeroOut(jobData.phoneNumber)
    ) {
      userUpdateData["$unset"] = { room: 1, currentJob: 1 };
    }

    await userModel
      .findOneAndUpdate({ _id: userProfile._id }, userUpdateData, { new: true })
      .exec();

    return JobController.getJob(jobId);
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}

function parseDate(input, format) {
  format = format || "yyyy-mm-dd"; // default format
  var parts = input.match(/(\d+)/g),
    i = 0,
    fmt = {};
  // extract date-part indexes from the format
  format.replace(/(yyyy|dd|mm)/g, function(part) {
    fmt[part] = i++;
  });

  return new Date(parts[fmt["yyyy"]], parts[fmt["mm"]] - 1, parts[fmt["dd"]]);
}
