import { NextFunction, Request, Response } from "express";
import * as lodash from "lodash";
import { helpers, jwtHelper, normalizeError } from "../../utils";
import ImageService from "../../services/image";
import HttpResponse from "../../services/response";

export default class OrderController {
  /**
   * @swagger
   * tags:
   *   - name: Order
   *     description: Order Control
   */

  /**
   * @swagger
   * /v1/admin/homeKey/order/list:
   *   get:
   *     description: Get order job
   *     tags: [Order]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: keyword
   *         in: query
   *         type:  string
   *         description: Keyword to find order
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
   *         description: Number of order returned
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

  static async getOrderListByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        order: OrderModel,
        user: UserModel,
        job: jobModel,
        room: roomModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      let { size, page } = req.query;
      let condition;
      condition = [
        {
          $lookup: {
            from: "jobs",
            localField: "job",
            foreignField: "_id",
            as: "job",
          },
        },
        { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
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
      const data = [];
      const dataNone = [];
      const resData = await OrderModel.paginate(size, page, condition);
      if (!resData) {
        return HttpResponse.returnBadRequestResponse(res, "order.not.exist");
      }
      for (let i = 0; i < resData.data.length; i++) {
        let userData = await UserModel.findOne(
          {
            _id: resData.data[i].user._id,
          },
          { password: 0, token: 0 }
        )
          .lean()
          .exec();
        if (userData) {
          resData.data[i].userDetail = userData;
        }
        if (resData.data[i].job) {
          const DataRoom = await roomModel
            .findOne({ _id: resData.data[i].job.room })
            .lean()
            .exec();
          if (DataRoom) {
            resData.data[i].roomDetail = DataRoom;
          }
        }

        let floorData = await floorModel
          .findOne({ rooms: resData.data[i].job.room })
          .populate("rooms")
          .lean()
          .exec();
        if (floorData) {
          resData.data[i].floorDetail = floorData;
          let motelRoomData = await motelRoomModel
            .findOne({ floors: floorData._id })
            .populate("floors")
            .lean()
            .exec();
          if (motelRoomData) {
            resData.data[i].motelRoomDataDetail = motelRoomData;
          }
        }
        if (resData.data[i].paymentMethod !== "none") {
          data.push(resData.data[i]);
        } else {
          dataNone.push(resData.data[i]);
        }
      }
      const dataRes = {
        data: [],
        dataNone: [],
      };
      dataRes.data = data;
      dataRes.dataNone = dataNone;

      return HttpResponse.returnSuccessResponse(res, dataRes);
    } catch (e) {
      next(e);
    }
  }

  static async getOrderListByHost(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const {
        order: OrderModel,
        user: UserModel,
        job: jobModel,
        floor: floorModel,
        room: roomModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      let { size, page } = req.query;
      let condition;
      condition = [
        {
          $lookup: {
            from: "jobs",
            localField: "job",
            foreignField: "_id",
            as: "job",
          },
        },
        { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
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
      const data = [];
      let flag = false;
      const dataUser = [];
      const dataNone = [];
      const resData = await OrderModel.paginate(size, page, condition);
      if (!resData) {
        return HttpResponse.returnBadRequestResponse(res, "order.not.exist");
      }
      for (let i = 0; i < resData.data.length; i++) {
        let userData = await UserModel.findOne(
          {
            _id: resData.data[i].user._id,
          },
          { password: 0, token: 0 }
        )
          .lean()
          .exec();
        if (userData) {
          resData.data[i].userDetail = userData;
        }

        if (resData.data[i].job) {
          const DataRoom = await roomModel
            .findOne({ _id: resData.data[i].job.room })
            .lean()
            .exec();
          if (DataRoom) {
            resData.data[i].roomDetail = DataRoom;
          }
        }

        let floorData = await floorModel
          .findOne({ rooms: resData.data[i].job.room })
          .populate("rooms")
          .lean()
          .exec();
        if (floorData) {
          resData.data[i].floorDetail = floorData;
          let motelRoomData = await motelRoomModel
            .findOne({ floors: floorData._id })
            .populate("floors")
            .lean()
            .exec();
          if (motelRoomData) {
            resData.data[i].motelRoomDataDetail = motelRoomData;
          }
        }
        if (resData.data[i].paymentMethod !== "none") {
          data.push(resData.data[i]);
        } else {
          dataNone.push(resData.data[i]);
        }
      }
      const dataRes = {
        data: [],
        dataNone: [],
      };
      console.log("data.length", data.length);
      const userData = req["userId"];
      if (data.length > 0) {
        for (let j = 0; j < data.length; j++) {
          if (data[j].motelRoomDataDetail.owner == userData.toString()) {
            dataRes.data.push(data[j]);
          }
        }
      }
      console.log("data.length", dataNone.length);
      if (dataNone.length > 0) {
        for (let k = 0; k < dataNone.length; k++) {
          console.log(dataNone[k].motelRoomDataDetail.owner);
          if (dataNone[k].motelRoomDataDetail.owner == userData.toString()) {
            dataRes.dataNone.push(dataNone[k]);
          }
        }
      }

      return HttpResponse.returnSuccessResponse(res, dataRes);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/homeKey/order/{id}:
   *   get:
   *     description: Get order by id
   *     tags: [Order]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: orderId
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

  static async getOrderByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const { order: OrderModel } = global.mongoModel;

      let resData = await OrderModel.findOne({
        _id: req.params.id,
        isDeleted: false,
      })
        .populate([
          {
            model: "User",
            path: "user",
            select: { password: 0, token: 0, isDeleted: 0, _v: 0 },
          },
        ])
        .lean()
        .populate("UNC")
        .exec();

      if (!resData) {
        return HttpResponse.returnBadRequestResponse(res, "order.not.exist");
      }
      if (resData.UNC) {
        resData.UNC = await helpers.getImageUrl(resData.UNC);
      }

      return HttpResponse.returnSuccessResponse(res, resData);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * definitions:
   *   Order:
   *     properties:
   *       amount:
   *         type: number
   */

  /**
   * @swagger
   * /v1/admin/homeKey/order/{id}:
   *   put:
   *     description: Get order by id
   *     tags: [Order]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: orderId
   *       - name: body
   *         in: body
   *         required:  true
   *         description: motel room data
   *         schema:
   *           type:  object
   *           $ref: '#definitions/Order'
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

  static async editOrderByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const { order: OrderModel } = global.mongoModel;

      let resData = await OrderModel.findOne({
        _id: req.params.id,
        isDeleted: false,
      })
        .populate([
          {
            model: "User",
            path: "user",
            select: { password: 0, token: 0, isDeleted: 0, _v: 0 },
          },
        ])
        .lean()
        .exec();

      if (!resData) {
        return HttpResponse.returnBadRequestResponse(res, "order.not.exist");
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

      let { body: data } = req;

      return HttpResponse.returnSuccessResponse(
        res,
        await OrderModel.findOneAndUpdate(
          { _id: resData._id },
          lodash.omitBy({ amount: data.amount }, lodash.isUndefined),
          { new: true }
        )
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/homeKey/room/{id}/order:
   *   put:
   *     description: Edit order by room
   *     tags: [Order]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: roomId
   *       - name: body
   *         in: body
   *         required:  true
   *         description: motel room data
   *         schema:
   *           type:  object
   *           $ref: '#definitions/Order'
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

  static async editOrderByOwner(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const {
        room: roomModel,
        job: jobModel,
        order: OrderModel,
      } = global.mongoModel;

      let roomData = await roomModel
        .findOne({
          _id: req.params.id,
          isDeleted: false,
        })
        .lean()
        .exec();

      if (!roomData) {
        return HttpResponse.returnBadRequestResponse(res, "room.not.exist");
      }

      if (roomData.status === "available") {
        return HttpResponse.returnBadRequestResponse(res, "room.is.available");
      }

      let jobData = await jobModel
        .findOne({ room: roomData._id, isDeleted: false })
        .lean()
        .exec();

      if (!jobData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "room.have.not.order"
        );
      }

      // if (jobData.status !== 'pendingMonthlyPayment') {
      //   return HttpResponse.returnBadRequestResponse(res, 'job.not.pendingMonthlyPayment');
      // }

      let orderData = await OrderModel.findOne({
        _id: jobData.currentOrder,
        isDeleted: false,
      })
        .lean()
        .exec();

      if (!orderData) {
        return HttpResponse.returnBadRequestResponse(res, "order.not.exist");
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

      let { body: data } = req;

      return HttpResponse.returnSuccessResponse(
        res,
        await OrderModel.findOneAndUpdate(
          { _id: orderData._id },
          lodash.omitBy({ amount: data.amount }, lodash.isUndefined),
          { new: true }
        )
      );
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /v1/admin/homeKey/order/{id}:
   *   delete:
   *     description: Delete order by id
   *     tags: [Order]
   *     produces:
   *       - application/json
   *       - multipart/form-data
   *     parameters:
   *       - name: id
   *         in: path
   *         type: string
   *         description: orderId
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

  static async deleteOrderByAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      // Init models
      const { order: orderModel } = global.mongoModel;

      let resData = await orderModel
        .findOne({ _id: req.params.id, isDeleted: false })
        .populate([
          {
            model: "User",
            path: "user",
            select: { password: 0, token: 0, isDeleted: 0, _v: 0 },
          },
        ])
        .lean()
        .exec();

      if (!resData) {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Đơn hàng không tồn tại"
        );
      }

      if (resData.type !== "recharge") {
        return HttpResponse.returnBadRequestResponse(
          res,
          "Đơn hàng không được xóa"
        );
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

      await orderModel.remove({ _id: req.params.id }).exec();

      return HttpResponse.returnSuccessResponse(res, null);
    } catch (e) {
      next(e);
    }
  }

  //   Get List User to Order
  static async getOrderByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const id = req.params.id;
      // Init models
      const {
        order: OrderModel,
        user: UserModel,
        job: jobModel,
        floor: floorModel,
        motelRoom: motelRoomModel,
      } = global.mongoModel;
      let { size, page } = req.query;
      let condition;
      condition = [
        // {
        //   $lookup: {
        //     from: "users",
        //     localField: "user",
        //     foreignField: "_id",
        //     as: "user",
        //   },
        // },
        // { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
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

      const data = [];
      const dataNone = [];

      const resData = await OrderModel.paginate(size, page, condition);
      if (resData) {
        for (let i = 0; i < resData.data.length; i++) {
          if (resData.data[i].user._id == id) {
            let userData = await UserModel.findOne(
              {
                _id: resData.data[i].user._id,
              },
              { password: 0, token: 0 }
            )
              .lean()
              .exec();
            if (userData) {
              resData.data[i].userDetail = userData;
            }

            // get Job
            const jobData = await jobModel
              .findOne({ _id: resData.data[i].job })
              .populate("room")
              .lean()
              .exec();
            if (jobData) {
              resData.data[i].jobDetail = jobData;
              let floorData = await floorModel
                .findOne({ rooms: jobData.room._id })
                .populate("rooms")
                .lean()
                .exec();
              if (floorData) {
                resData.data[i].floorDetail = floorData;
                let motelRoomData = await motelRoomModel
                  .findOne({ floors: floorData._id })
                  .populate("floors")
                  .lean()
                  .exec();
                if (motelRoomData) {
                  resData.data[i].motelRoomDataDetail = motelRoomData;
                }
              }
            }

            if (resData.data[i].paymentMethod !== "none") {
              data.push(resData.data[i]);
            } else {
              dataNone.push(resData.data[i]);
            }
          }
        }
      }
      const dataRes = {
        data: [],
        dataNone: [],
      };
      dataRes.data = data;
      dataRes.dataNone = dataNone;

      if (!resData) {
        return HttpResponse.returnBadRequestResponse(res, "order.not.exist");
      }

      return HttpResponse.returnSuccessResponse(res, dataRes);
    } catch (e) {
      next(e);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
