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
import { now } from "moment";



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

    // let startTime = req.params.startTime;

    // const lastStartDay = new Date(startTime);

    // lastStartDay.setDate(lastStartDay.getDate() - 1);
    // const lastStartDayhihi = lastStartDay.toISOString().slice(0, -1);

    // startTime = startTime.slice(0, -1);

    // let endTime = req.params.endTime;

    // const lastEndDay = new Date(endTime);
    // lastEndDay.setDate(lastEndDay.getDate() - 1);
    // const lastEndDayhihi = lastEndDay.toISOString().slice(0, -1);

    // endTime = endTime.slice(0, -1);

    let currentDay = new Date();

    currentDay.setHours(currentDay.getHours() + 7);

    console.log("currentDay", currentDay);
    let currentDayString = currentDay.toISOString().slice(0, -14);
    console.log("currentDayString", currentDayString);

  

    // CHÚ Ý: CHƯA SET NGÀY TRƯỚC ĐÓ KHÔNG CÓ DỮ LIỆU, ĐỢI CÓ DB THÌ DỄ SORT HƠN
    try {

      const url1 = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/data?from_time=${currentDayString}T00:00:00.000&to_time=${currentDayString}T23:59:59.999&limit=100&page=1`;
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
      
      const url2 = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/lastedtotime?to_time=${currentDayString}T00:00:00.000`;
      const res2: AxiosResponse = await axios.get(url2);
      const lastDataBeforeDay = res2.data;

      const kWhData = [];
      let lastValue = 0;
      let activePowerPerHour = [];
      let electricPerHour = [];

      if (lastDataBeforeDay !== undefined) {
        lastValue = lastDataBeforeDay.value.Total_kWh;
    
        const kWhArr = latestDataDevice.map(item => (item !== null ? item.Value.Total_kWh : null));

        activePowerPerHour = latestDataDevice.map(item => (item !== null ? item.Value.Active_Power*1000 : null));
        electricPerHour = latestDataDevice.map(item => (item !== null ? item.Value.Current : null));
      
        for (let i = 0; i < kWhArr.length; i++) {
          if (kWhArr[i] === null) {
            kWhData.push(null);
          } else {
            let result = kWhArr[i] - lastValue;
            // kWhData.push(result);
            // lastValue = kWhArr[i];
            if (result < 0) {
              kWhData.push(null);
              lastValue = kWhArr[i];
            } else {
              kWhData.push(result);
              lastValue = kWhArr[i];
            }
          }
        }
      }

      let totalkWhDay = kWhData.reduce((acc, curr) => acc + curr, 0);


      const resultData = {
        electricPerHour: electricPerHour, 
        activePowerPerHour: activePowerPerHour,
        totalkWhDay: totalkWhDay,
        kWhData: kWhData,
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

      // Cách 1
    //   const url = `http://homeland-2.ddns.net:8005/api/v1/devices/23/data?from_time=2024-01-01T00:00:00.000&to_time=2024-01-31T23:59:59.999&limit=100&page=1`

    //   const energySet = new Set();
    //   const response: AxiosResponse = await axios.get(url);

    //   let pageCount = 0;

    //   if (response !== undefined) {
    //     pageCount = response.data.MetaData.PageCount;
    //   }

    //   energySet.add(response.data.Records.reverse());
  

    //   for (let i = 2; i <= pageCount; i++ ) {
    //     const url1 = `http://homeland-2.ddns.net:8005/api/v1/devices/23/data?from_time=2024-01-01T00:00:00.000&to_time=2024-01-31T23:59:59.999&limit=100&page=${i}`
    //     const res1: AxiosResponse = await axios.get(url1);

    //     console.log(i)

    //     energySet.add(res1.data.Records.reverse());
    //   }

    //   console.log("Set", energySet);

    //   let rawData = [].concat(...energySet);

    //   console.log("flattenedArray", rawData.length);


    // function getDaysInCurrentMonth(): number {

    //   // Đang lấy theo giờ Quốc tế, sớm hơn giờ Việt nam 7 tiếng
    //   const currentDate = new Date();
    //   // Cộng thêm 7
    //   currentDate.setHours(currentDate.getHours() + 7);

    //   console.log("currentDate", currentDate);
    //   const currentMonth = currentDate.getMonth();
    //   console.log("currentMonth", currentMonth);
    //   const currentYear = currentDate.getFullYear();
    //   console.log("currentYear", currentYear);
    //   const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    //   return lastDayOfMonth;
    // }
    
    // const daysInCurrentMonth: number = getDaysInCurrentMonth();
    // console.log("Số ngày của tháng hiện tại là:", daysInCurrentMonth);

    //   interface DataEntry {
    //     Time: string;
    //     Total_kWh: number;
    //   }

    // // // LẤY MỖINGÀY 1 LẦN
    //   function getLastObjectPerDay(data: DataEntry[]): (DataEntry | null)[] {
    //     const lastObjectPerDay: { [key: number]: DataEntry } = {};
    
    //     for (const entry of data) {
    //         // Chuyển đổi chuỗi thời gian thành đối tượng Date
    //         const time = new Date(entry.Time);

    //         console.log("time", time)
    
    //         // Lấy giờ từ đối tượng Date
    //         const day = time.getDate() - 1;
    
    //         // Nếu đối tượng không tồn tại hoặc là đối tượng cuối cùng của giờ hiện tại
    //         if (!lastObjectPerDay[day] || time > new Date(lastObjectPerDay[day].Time)) {
    //             lastObjectPerDay[day] = entry;
    //         }
    //     }
    
    //     // Chuyển đổi dictionary thành mảng
    //     const result: (DataEntry | null)[] = Array.from({ length: daysInCurrentMonth }, (_, day) => lastObjectPerDay[day] || null);
    
    //     return result;
    // }

    // const latestDataDevice: (DataEntry | null)[] = getLastObjectPerDay(rawData);
      

    // console.log("latestDataDevice", latestDataDevice);
    // console.log(latestDataDevice.length);

    // const url2 = `http://homeland-2.ddns.net:8005/api/v1/devices/23/lastedtotime?to_time=2024-01-01T00:00:00.000`;
    // const res2: AxiosResponse = await axios.get(url2);


    // const lastDataBeForeMon = res2.data;

    // const kWhPerDay = [];
    // let lastValue = 0;
    // let activePowerPerHour = [];
    // let electricPerHour = [];

    // if (lastDataBeForeMon !== undefined) {
    //   lastValue = lastDataBeForeMon.value.Total_kWh;
  
    //   const kWhArr = latestDataDevice.map(item => (item !== null ? item.Value.Total_kWh : null));

    //   // activePowerPerHour = latestDataDevice.map(item => (item !== null ? item.Value.Active_Power*1000 : null));
    //   // electricPerHour = latestDataDevice.map(item => (item !== null ? item.Value.Current : null));
    
    //   for (let i = 0; i < kWhArr.length; i++) {
    //     if (kWhArr[i] === null) {
    //       kWhPerDay.push(null);
    //     } else {
    //       let result = kWhArr[i] - lastValue;
    //       kWhPerDay.push(result);
    //       lastValue = kWhArr[i];
    //     }
    //   }
    // }

    //   let totalkWhDay = kWhPerDay.reduce((acc, curr) => acc + curr, 0);

    // const resultData = {
    //   totalkWhDay: totalkWhDay,
    //   kWhPerDay: kWhPerDay,
    //   lastDataBeForeMon: lastDataBeForeMon,
    //   latestDataDevice: latestDataDevice,
    // };

      // Cách 2
      // let currentTime = new Date();

      // currentTime.setHours(currentTime.getHours() + 7);

      // const nowYear = currentTime.getFullYear();

      // let nowMon = currentTime.getMonth() + 1;
      // let nowMonApi = '';
      // if (nowMon < 10) {
      //   nowMonApi = '0' + nowMon.toString();
      // } else {
      //   nowMonApi  = nowMon.toString();
      // }

      // const nowDay = currentTime.getDate();
      // let nowDayApi = '';
      // if (nowDay < 10) {
      //   nowDayApi = '0' + nowDay.toString();
      // } else {
      //   nowDayApi  = nowDay.toString();
      // }

      // const nowHour = currentTime.getHours() - 7;

      // const currentTimeViet = currentTime.toISOString().slice(0, -1);

      // console.log("currentTimeViet", currentTimeViet);

      // console.log(" nowYear", nowYear);
      // console.log(" nowMon", nowMon);
      // console.log(" nowDay", nowDay);
      // console.log(" nowHour", nowHour);


      // for (let i = nowDay ; i > 0; i--) {
      //   let nowDayApi = nowDay.toString();
      //   if (nowDay < 10) {
      //     nowDayApi = '0' + nowDay.toString();
      //   }
      //   // ngày hiện tại
      //   if (i == nowDay) {
      //     for (let j = nowHour; j >= 0; j -- ) {
      //       let nowHourApi = j.toString();
      //       if (j < 10) {
      //         nowHourApi = '0' + j.toString();
      //       }
      //       const url = `http://homeland-2.ddns.net:8005/api/v1/devices/23/data?from_time=${nowYear}-${nowMonApi}-${nowDayApi}T${nowHourApi}:00:00.000&to_time=${nowYear}-${nowMonApi}-${nowDayApi}T${nowHourApi}:59:59.999&limit=1`
      //       const respone: AxiosResponse = await axios.get(url);
      //       if (respone.data.Records.length !== 0) {
      //         break;
      //       }
      //     }
      //   }

      //   //Các ngày trước đó
      //   if (i < nowDay) {
      //     for (let j = 23; j >= 0; j -- ) {
      //       let nowHourApi = j.toString();
      //       if (j < 10) {
      //         nowHourApi = '0' + j.toString();
      //       }
      //       const url = `http://homeland-2.ddns.net:8005/api/v1/devices/23/data?from_time=${nowYear}-${nowMonApi}-${nowDayApi}T${nowHourApi}:00:00.000&to_time=${nowYear}-${nowMonApi}-${nowDayApi}T${nowHourApi}:59:59.999&limit=1`
      //       const respone: AxiosResponse = await axios.get(url);
      //       if (respone.data.Records.length !== 0) {
      //         break;
      //       }
      //     }

      //   }

      //   console.log("Day", i);
      // }


      // Cách 3
      const deviceId = req.params.id;

      let currentTime = new Date();

      currentTime.setHours(currentTime.getHours() + 7);

      const nowYear = currentTime.getFullYear();

      let nowMon = currentTime.getMonth() + 1;
      let nowMonApi = '';
      if (nowMon < 10) {
        nowMonApi = '0' + nowMon.toString();
      } else {
        nowMonApi  = nowMon.toString();
      }

      const nowDay = currentTime.getDate();
      let nowDayApi = '';
      if (nowDay < 10) {
        nowDayApi = '0' + nowDay.toString();
      } else {
        nowDayApi  = nowDay.toString();
      }

      const nowHour = currentTime.getHours() - 7;

      const currentTimeViet = currentTime.toISOString().slice(0, -1);

      console.log("currentTimeViet", currentTimeViet);

      console.log(" nowYear", nowYear);
      console.log(" nowMon", nowMon);
      console.log(" nowDay", nowDay);
      console.log(" nowHour", nowHour);


      let resultDataPerDay = [];

      for (let i = nowDay ; i > 0; i--) {
        let nowDayApi = i.toString();
        if (i < 10) {
          nowDayApi = '0' + i.toString();
        }
        const url = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/data?from_time=${nowYear}-${nowMonApi}-${nowDayApi}T00:00:00.000&to_time=${nowYear}-${nowMonApi}-${nowDayApi}T23:59:59.999&limit=1`
        const respone: AxiosResponse = await axios.get(url);
        if (respone.data.Records.length !== 0) {
          resultDataPerDay.push(respone.data.Records[0]);
        } else {
          resultDataPerDay.push(null);
        }

        console.log("Day", i);
      }

    resultDataPerDay = resultDataPerDay.reverse();

    const url2 = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/lastedtotime?to_time=${nowYear}-${nowMonApi}-01T00:00:00.000`;
    const res2: AxiosResponse = await axios.get(url2);

    let lastDataBeforeMon = [];
    const kWhData = [];
    let lastValue = 0;
    let activePowerPerHour = [];
    let electricPerHour = [];
    let totalkWhMon = -1;

    if (res2.status === 200) {
      lastDataBeforeMon = res2.data;
      lastValue = lastDataBeforeMon.value.Total_kWh;
  
      const kWhArr = resultDataPerDay.map(item => (item !== null ? item.Value.Total_kWh : null));
      for (let i = 0; i < kWhArr.length; i++) {
        if (kWhArr[i] === null) {
          kWhData.push(null);
        } else {
          let result = kWhArr[i] - lastValue;
          // Trường hợp thay đồng hồ khác có chỉ số nhỏ hơn chỉ số cũ, nếu ngày đó thay đồng hồ thì chấp nhận mất dữ liệu của ngày đó
          if (result < 0) {
            kWhData.push(null);
            lastValue = kWhArr[i];
          } else {
            kWhData.push(result);
            lastValue = kWhArr[i];
          }
        }
      }

      totalkWhMon = kWhData.reduce((acc, curr) => acc + curr, 0);

    }

      const resultData = {
        totalkWhMon: totalkWhMon, 
        kWhData: kWhData,
        lastDataBeforeMon: lastDataBeforeMon,
        resultDataPerDay: resultDataPerDay,
      }
    
     return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }


  static async getCurrentData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {

    const deviceId = req.params.id;

    const client = new Client({
      user: 'postgres',
      host: 'localhost',
      database: 'testdb',
      password: '1234',
      port: 8006, // Port mặc định của PostgreSQL là 5432
  });
    
    try {

      const url2 = `http://homeland-2.ddns.net:8005/api/v1/devices/23/data?from_time=2024-01-19T00:00:00.000&to_time=2024-01-19T23:59:59.999&limit=1`;
      const res2: AxiosResponse = await axios.get(url2);

      console.log("res2", res2.data.Records[0].Time);
      console.log("type of res2", typeof(res2.data.Records[0].Time));
      

      const latestDataDevice = "hihi";
      
      return HttpResponse.returnSuccessResponse(res, latestDataDevice);
    } catch (e) {
      next(e);
    } 
    finally {
      await client.end(); 
   }
  }


  static async backUpDataPerDay(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {


    // let startTime = req.params.startTime;

    // const lastStartDay = new Date(startTime);

    // lastStartDay.setDate(lastStartDay.getDate() - 1);
    // const lastStartDayhihi = lastStartDay.toISOString().slice(0, -1);

    // startTime = startTime.slice(0, -1);

    // let endTime = req.params.endTime;

    // const lastEndDay = new Date(endTime);
    // lastEndDay.setDate(lastEndDay.getDate() - 1);
    // const lastEndDayhihi = lastEndDay.toISOString().slice(0, -1);

    // endTime = endTime.slice(0, -1);

    // let currentDay = new Date();

    // currentDay.setHours(currentDay.getHours() + 7);

    // console.log("currentDay", currentDay);
    // let currentDayString = currentDay.toISOString().slice(0, -14);
    // console.log("currentDayString", currentDayString);

  

    // CHÚ Ý: CHƯA SET NGÀY TRƯỚC ĐÓ KHÔNG CÓ DỮ LIỆU, ĐỢI CÓ DB THÌ DỄ SORT HƠN
    try {
      const { electrics: ElectricsModel } = global.mongoModel;
      const urlDevices = 'http://homeland-2.ddns.net:8005/api/v1/devices/';
      const resListDevice: AxiosResponse = await axios.get(urlDevices);

      const countDevice = resListDevice.data.length - 10;
      console.log("countDevice", countDevice);

      console.log(resListDevice.data[0]);

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

    
    const dataDayAllDeivceList = [];
    for (let i = 0; i < countDevice; i++) {
      const urlData = `http://homeland-2.ddns.net:8005/api/v1/devices/${resListDevice.data[i].Id}/data?from_time=2024-01-20T00:00:00.000&to_time=2024-01-20T23:59:59.999&limit=100&page=1`;
      const resData: AxiosResponse = await axios.get(urlData);

      const dataGetList = resData.data.Records;

      const dataPerHourList: (DataEntry | null)[] = getLastObjectPerHour(dataGetList);

      dataDayAllDeivceList.push(dataPerHourList);

      console.log("DÂy", i);
    }

    // console.log("dataDayAllDeivceList", dataDayAllDeivceList);

    const tempList: any[][] = dataDayAllDeivceList;
    //hạ cấp mảng
    const dataDayAllDeivceListFlat: any[] = tempList.reduce((acc, curr) => acc.concat(curr.filter(item => item !== null)), []);

    

    dataDayAllDeivceListFlat.sort((a, b) => {
      const timeA = new Date(a.Time).getTime();
      const timeB = new Date(b.Time).getTime();
      return timeA - timeB;
    });

    console.log("dataDayAllDeivceListFlat", dataDayAllDeivceListFlat);
    



    //   const url1 = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/data?from_time=${currentDayString}T00:00:00.000&to_time=${currentDayString}T23:59:59.999&limit=100&page=1`;
    //   const res1: AxiosResponse = await axios.get(url1);

    //   const rawData1 = res1.data.Records;
    //   // const rawData1 = res1.data;

    //   interface DataEntry {
    //     Time: string;
    //     Total_kWh: number;
    //   }

    // // LẤY MỖI GIỜ 1 LẦN
    //   function getLastObjectPerHour(data: DataEntry[]): (DataEntry | null)[] {
    //     const lastObjectPerHour: { [key: number]: DataEntry } = {};
    
    //     for (const entry of data) {
    //         // Chuyển đổi chuỗi thời gian thành đối tượng Date
    //         const time = new Date(entry.Time);
    
    //         // Lấy giờ từ đối tượng Date
    //         const hour = time.getHours();
    
    //         // Nếu đối tượng không tồn tại hoặc là đối tượng cuối cùng của giờ hiện tại
    //         if (!lastObjectPerHour[hour] || time > new Date(lastObjectPerHour[hour].Time)) {
    //             lastObjectPerHour[hour] = entry;
    //         }
    //     }
    
    //     // Chuyển đổi dictionary thành mảng
    //     const result: (DataEntry | null)[] = Array.from({ length: 24 }, (_, hour) => lastObjectPerHour[hour] || null);
    
    //     return result;
    // }

    // const latestDataDevice: (DataEntry | null)[] = getLastObjectPerHour(rawData1);
      
    //   const url2 = `http://homeland-2.ddns.net:8005/api/v1/devices/${deviceId}/lastedtotime?to_time=${currentDayString}T00:00:00.000`;
    //   const res2: AxiosResponse = await axios.get(url2);
    //   const lastDataBeforeDay = res2.data;

    //   const kWhData = [];
    //   let lastValue = 0;
    //   let activePowerPerHour = [];
    //   let electricPerHour = [];

    //   if (lastDataBeforeDay !== undefined) {
    //     lastValue = lastDataBeforeDay.value.Total_kWh;
    
    //     const kWhArr = latestDataDevice.map(item => (item !== null ? item.Value.Total_kWh : null));

    //     activePowerPerHour = latestDataDevice.map(item => (item !== null ? item.Value.Active_Power*1000 : null));
    //     electricPerHour = latestDataDevice.map(item => (item !== null ? item.Value.Current : null));
      
    //     for (let i = 0; i < kWhArr.length; i++) {
    //       if (kWhArr[i] === null) {
    //         kWhData.push(null);
    //       } else {
    //         let result = kWhArr[i] - lastValue;
    //         // kWhData.push(result);
    //         // lastValue = kWhArr[i];
    //         if (result < 0) {
    //           kWhData.push(null);
    //           lastValue = kWhArr[i];
    //         } else {
    //           kWhData.push(result);
    //           lastValue = kWhArr[i];
    //         }
    //       }
    //     }
    //   }

    //   let totalkWhDay = kWhData.reduce((acc, curr) => acc + curr, 0);


    //   const resultData = {
    //     electricPerHour: electricPerHour, 
    //     activePowerPerHour: activePowerPerHour,
    //     totalkWhDay: totalkWhDay,
    //     kWhData: kWhData,
    //     lastDataBeforeDay: lastDataBeforeDay,
    //     latestDataDevice: latestDataDevice,
    //   }
      const resultData= "hihih";
      return HttpResponse.returnSuccessResponse(res, resultData);
    } catch (e) {
      next(e);
    }
  }
  
}
