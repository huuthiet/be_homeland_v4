import { NextFunction, Request, Response } from "express";
import axios, { AxiosResponse } from 'axios';
import * as lodash from "lodash";
// import { helpers } from "../../utils";
import ImageService from "../../services/image";
import HttpResponse from "../../services/response";
import e = require("express");
import sendMail from "../../utils/Mailer/mailer";
import * as rn from "random-number";
import * as bcrypt from "bcryptjs";
import { constructors } from "libs/typegoose/data";
import { raw } from "body-parser";

var options = [
  {
    key: "AGB",
    value: "AGB",
    label: "Ngân hàng Nông nghiệp và Phát triển Nông thôn (Agribank)",
  },
  {
    key: "BID",
    value: "BID",
    label: "Ngân hàng Đầu tư và Phát triển Việt Nam (BIDV)",
  },
  {
    key: "VBB",
    value: "VBB",
    label: "Ngân hàng TMCP Công Thương Việt Nam (Vietbank)",
  },
  { key: "ACB", value: "ACB", label: "Ngân hàng TMCP Á Châu (ACB)" },
  { key: "MB", value: "MB", label: "Ngân hàng TMCP Quân Đội (MB)" },
  { key: "SCB", value: "SCB", label: "Ngân hàng TMCP Sài Gòn (SCB)" },
  {
    key: "TPB",
    value: "TPB",
    label: "Ngân hàng TMCP Tiên Phong (TPBank)",
  },
  {
    key: "DAB",
    value: "DAB",
    label: "Ngân hàng TMCP Đông Á (DongA Bank)",
  },
  { key: "BAB", value: "BAB", label: "Ngân hàng TMCP Bắc Á (BacABank)" },
  {
    key: "MSB",
    value: "MSB",
    label: "Ngân hàng TMCP Hàng Hải (Maritime Bank)",
  },
  {
    key: "TCB",
    value: "TCB",
    label: "Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)",
  },
  {
    key: "VPB",
    value: "VPB",
    label: "Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)",
  },
  {
    key: "SHB",
    value: "SHB",
    label: "Ngân hàng TMCP Sài Gòn-Hà Nội (SHB)",
  },
  {
    key: "OJB",
    value: "OJB",
    label: "Ngân hàng TMCP Đại Dương (OceanBank)",
  },
  { key: "NCB", value: "NCB", label: "Ngân hàng NCB" },
  { key: "EXIMBANK", value: "EXIMBANK", label: "Ngân hàng EximBank" },
  { key: "MSBANK", value: "MSBANK", label: "Ngân hàng MSBANK" },
  { key: "NAMABANK", value: "NAMABANK", label: "Ngân hàng NamABank" },
  { key: "VNMART", value: "VNMART", label: "Vi điện tử VnMart" },
  {
    key: "VIETINBANK",
    value: "VIETINBANK",
    label: "Ngân hàng Vietinbank",
  },
  { key: "VIETCOMBANK", value: "VIETCOMBANK", label: "Ngân hàng VCB" },
  { key: "HDBANK", value: "HDBANK", label: "Ngân hàng HDBank" },
  { key: "DONGABANK", value: "DONGABANK", label: "Ngân hàng Đông Á" },
  { key: "TPBANK", value: "TPBANK", label: "Ngân hàng TPBank" },
  { key: "OJB", value: "OJB", label: "Ngân hàng OceanBank" },
  {
    key: "TECHCOMBANK",
    value: "TECHCOMBANK",
    label: "Ngân hàng Techcombank",
  },
  { key: "VPBANK", value: "VPBANK", label: "Ngân hàng VPBank" },
  { key: "SACOMBANK", value: "SACOMBANK", label: "Ngân hàng SacomBank" },
  { key: "OCB", value: "OCB", label: "Ngân hàng OCB" },
  { key: "IVB", value: "IVB", label: "Ngân hàng IVB" },
  { key: "VISA", value: "VISA", label: "Thanh toán qua VISA/MASTER" },
];

export default class EnergyController {
  // static async getAllDevice(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<any> {
  //   try {
  //     // Init user model`
  //     const { banking: BankingModel, image: imageModel } = global.mongoModel;

  //     return HttpResponse.returnSuccessResponse(res, options);
  //   } catch (e) {
  //     next(e);
  //   }
  // }
  static async getAllDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {

      const url = 'http://homeland-2.ddns.net:8005/api/v1/devices/';
      // const transactionsData:string = "hihi";
      const res2: AxiosResponse = await axios.get(url);

      const listDevice = res2.data;

      return HttpResponse.returnSuccessResponse(res, listDevice);
      // return HttpResponse.returnSuccessResponseString(res, transactionsData);
    } catch (e) {
      next(e);
    }
  }

  static async getDeviceData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {

    const deviceId = req.params.id;
    try {

      const url = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/data`;
      // const transactionsData:string = "hihi";
      const res2: AxiosResponse = await axios.get(url);

      const dataDevice = res2.data;
      
      return HttpResponse.returnSuccessResponse(res, dataDevice);
    } catch (e) {
      next(e);
    }
  }

  static async getLatestDeviceData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {

    const deviceId = req.params.id;
    try {

      const url = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/data?limit=1&page=1`;
      // const transactionsData:string = "hihi";
      const res2: AxiosResponse = await axios.get(url);

      // console.log("res2", res2.data);

      // const latestDataDevice = res2.data.Records[0];
      const latestDataDevice = res2.data;
      
      return HttpResponse.returnSuccessResponse(res, latestDataDevice);
    } catch (e) {
      next(e);
    }
  }

  static async getCurrentDayDataPerHour(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {

    const deviceId = req.params.id;
    let startTime = req.params.startTime;

    const lastStartDay = new Date(startTime);

    lastStartDay.setDate(lastStartDay.getDate() - 1);
    const lastStartDayhihi = lastStartDay.toISOString().slice(0, -1);

    startTime = startTime.slice(0, -1);

    let endTime = req.params.endTime;

    const lastEndDay = new Date(endTime);
    lastEndDay.setDate(lastEndDay.getDate() - 1);
    const lastEndDayhihi = lastEndDay.toISOString().slice(0, -1);

    endTime = endTime.slice(0, -1);

    

    console.log("startTimeê", startTime);
    console.log("endTime", endTime);

    

    console.log("lastEndDay", lastEndDayhihi);
    console.log("lastEndDayhihi", lastEndDayhihi);


    // CHÚ Ý: CHƯA SET NGÀY TRƯỚC ĐÓ KHÔNG CÓ DỮ LIỆU, ĐỢI CÓ DB THÌ DỄ SORT HƠN
    try {

      const url1 = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/data?from_time=${startTime}&to_time=${endTime}&limit=100&page=1`;
      // const url1 = 'http://localhost:3000/Records';
      const res1: AxiosResponse = await axios.get(url1);

      const rawData1 = res1.data.Records;
      // const rawData1 = res1.data;

      interface DataEntry {
        Time: string;
        Total_kWh: number;
      }

    // LẤY MỖI GIỜ 1 LẦN
      function getLastObjectPerHour(data: DataEntry[]): (DataEntry | null)[] {
        const lastObjectPerHour: { [key: number]: DataEntry } = {};
    
        for (const entry of data) {
            // Chuyển đổi chuỗi thời gian thành đối tượng Date
            const time = new Date(entry.Time);
    
            // Lấy giờ từ đối tượng Date
            const hour = time.getHours();
    
            // Nếu đối tượng không tồn tại hoặc là đối tượng cuối cùng của giờ hiện tại
            if (!lastObjectPerHour[hour] || time > new Date(lastObjectPerHour[hour].Time)) {
                lastObjectPerHour[hour] = entry;
            }
        }
    
        // Chuyển đổi dictionary thành mảng
        const result: (DataEntry | null)[] = Array.from({ length: 24 }, (_, hour) => lastObjectPerHour[hour] || null);
    
        return result;
    }

    const latestDataDevice: (DataEntry | null)[] = getLastObjectPerHour(rawData1);

    console.log("lastStartDayhihixxxxxxxxx", lastStartDayhihi);
    console.log("lastEndDayhihixxxxxxxxxxx", lastEndDayhihi);

      const url2 = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/data?from_time=${lastStartDayhihi}&to_time=${lastEndDayhihi}&limit=1&page=1`;
      
      const res2: AxiosResponse = await axios.get(url2);
      // const lastDataBeforeDay = res2.data.Records.map(obj => ({ "Time": obj["Time"], "Total_kWh": obj["Value"]["Total_kWh"] }));
      const lastDataBeforeDay = res2.data.Records;

      const kWhPerHour = [];
      let lastValue = 0;
      let activePowerPerHour = [];
      let electricPerHour = [];

      if (lastDataBeforeDay !== undefined) {
        lastValue = lastDataBeforeDay[0].Value.Total_kWh;
    
        const kWhArr = latestDataDevice.map(item => (item !== null ? item.Value.Total_kWh : null));

        activePowerPerHour = latestDataDevice.map(item => (item !== null ? item.Value.Active_Power*1000 : null));
        electricPerHour = latestDataDevice.map(item => (item !== null ? item.Value.Current : null));
      
        for (let i = 0; i < kWhArr.length; i++) {
          if (kWhArr[i] === null) {
            kWhPerHour.push(null);
          } else {
            let result = kWhArr[i] - lastValue;
            kWhPerHour.push(result);
            lastValue = kWhArr[i];
          }
        }
      }

      let totalkWhDay = kWhPerHour.reduce((acc, curr) => acc + curr, 0);


      const resultData = {
        electricPerHour: electricPerHour, 
        activePowerPerHour: activePowerPerHour,
        totalkWhDay: totalkWhDay,
        kWhPerHour: kWhPerHour,
        lastDataBeforeDay: lastDataBeforeDay,
        latestDataDevice: latestDataDevice,
      }


      return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }

  static async getCurrentMonDataPerDay(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const resultData = "hihi";
     return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }
  
}
