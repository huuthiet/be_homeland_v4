import { NextFunction, Request, Response } from "express";
import * as mongoose from "mongoose";
import HttpResponse from "../../services/response";
export default class BillController {
  /* -------------------------------------------------------------------------- */
  /*                            START HELPER FUNCTION                           */
  /* -------------------------------------------------------------------------- */
  // Get Add by id
  static async insertDb(data, userId): Promise<any> {
    const {
      bill: billModel,
      optionsType: OptionsTypeModel,
    } = global.mongoModel;
    // check trung ma hoa đơn
    const dataCheck = await billModel
      .findOne({
        idBill: data.idBill,
      })
      .lean()
      .exec();
    // If user was deleted
    if (dataCheck) {
      return HttpResponse.returnErrorWithMessage("Mã Hóa Đơn tồn tại");
    }

    let billData = await billModel.create({
      user: userId,
      typeTaxAll: data.typeTaxAll,
      totalTaxAll: data.totalTaxAll,
      totalAndTaxAll: data.totalAndTaxAll,
      totalAll: data.totalAll,
      imgRoom: data.imgRoom,
      address: data.address,
      phoneUser: data.phoneUser,
      nameUser: data.nameUser,
      nameRoom: data.nameRoom,
      nameMotel: data.nameMotel,
      dateBill: data.dateBill,
      idBill: data.idBill,
      emailOwner: data.emailOwner,
    });

    const Room = await OptionsTypeModel.create({
      expense: data.expenseRoom,
      type: data.typeRoom,
      unitPrice: data.unitPriceRoom,
      total: data.totalRoom,
    });

    const Electricity = await OptionsTypeModel.create({
      expense: data.expenseElectricity,
      type: data.typeElectricity,
      unitPrice: data.unitPriceElectricity,
      total: data.totalElectricity,
    });

    const Water = await OptionsTypeModel.create({
      expense: data.expenseWater,
      type: data.typeWater,
      unitPrice: data.unitPriceWater,
      total: data.totalWater,
    });

    const Garbage = await OptionsTypeModel.create({
      expense: data.expenseGarbage,
      type: data.typeGarbage,
      unitPrice: data.unitPriceGarbage,
      total: data.totalGarbage,
    });

    const Wifi = await OptionsTypeModel.create({
      expense: data.expenseWifi,
      type: data.typeWifi,
      unitPrice: data.unitPriceWifi,
      total: data.totalWifi,
    });

    const Other = await OptionsTypeModel.create({
      expense: data.expenseOther,
      type: data.typeOther,
      unitPrice: data.unitPriceOther,
      total: data.totalOther,
    });

    billData = await billModel
      .findOneAndUpdate(
        { _id: billData._id },
        {
          room: Room._id,
          other: Other._id,
          wifi: Wifi._id,
          water: Water._id,
          garbage: Garbage._id,
          electricity: Electricity._id,
        },
        { new: true }
      )
      .lean()
      .exec();

    if (!billData) {
      return HttpResponse.returnErrorWithMessage("Hóa không tồn tại", "");
    }

    // Return floor data
    return billData._id;
  }

  static async createBill(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    // Init models
    const {
      bill: billModel,
      optionsType: OptionsTypeModel,
    } = global.mongoModel;
    const { body: data } = req;
    console.log(6666666666);
    const billData = BillController.insertDb(data, req["userId"]);

    return HttpResponse.returnSuccessResponse(
      res,
      await BillController.getBillById(billData)
    );
  }

  static async getBillDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      let { id: billId } = req.params;

      return HttpResponse.returnSuccessResponse(
        res,
        await BillController.getBillById(billId)
      );
    } catch (e) {
      next(e);
    }
  }

  // Get billId by id
  static async getBillById(billId: any, lang?: string): Promise<any> {
    const { bill: billModel } = global.mongoModel;

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return HttpResponse.returnErrorWithMessage("Hóa đơn không tồn tại", lang);
    }

    let resData = await billModel
      .findOne({ _id: billId })
      .populate("electricity garbage water wifi other room")
      .lean()
      .exec();

    if (!resData) {
      return HttpResponse.returnErrorWithMessage("Hóa không tồn tại", lang);
    }

    // Return floor data
    return resData;
  }

  // Get all Bill
  static async getBillList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { bill: billModel } = global.mongoModel;

    const sortType = req.query.sortType === "ascending" ? 1 : -1;
    let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
    let condition, sort;

    condition = [
      {
        $project: {
          isDeleted: 0,
          "user.password": 0,
          "user.token": 0,
          "user.isDeleted": 0,
          "user._v": 0,
        },
      },
      {
        $match: {
          user: req["userId"],
          createdAt: {
            $gte: new Date(startDate.toString()), // lớn hơn
            $lte: new Date(endDate.toString()), // nhỏ hơn
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
        default:
          sort = { createdAt: -1 };
      }
      condition.push({ $sort: sort });
    }

    const resData = await billModel.paginate(size, page, condition);

    if (!resData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Không có danh sách hóa đơn không tồn tại"
      );
    }
    return HttpResponse.returnSuccessResponse(res, resData);
  }

  static async getBillListAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { bill: billModel } = global.mongoModel;

    const sortType = req.query.sortType === "ascending" ? 1 : -1;
    let { sortBy, role, size, page, keyword, startDate, endDate } = req.query;
    let condition, sort;

    condition = [
      {
        $project: {
          isDeleted: 0,
          "user.password": 0,
          "user.token": 0,
          "user.isDeleted": 0,
          "user._v": 0,
        },
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate.toString()), // lớn hơn
            $lte: new Date(endDate.toString()), // nhỏ hơn
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
        default:
          sort = { createdAt: -1 };
      }
      condition.push({ $sort: sort });
    }

    const resData = await billModel.paginate(size, page, condition);

    if (!resData) {
      return HttpResponse.returnBadRequestResponse(
        res,
        "Không có danh sách hóa đơn không tồn tại"
      );
    }
    return HttpResponse.returnSuccessResponse(res, resData);
  }

  /* -------------------------------------------------------------------------- */
  /*                             END HELPER FUNCTION                            */
  /* -------------------------------------------------------------------------- */
}
