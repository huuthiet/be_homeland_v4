import * as moment from 'moment';
import axios, { AxiosResponse } from 'axios';

export default agenda => {
    console.log("hahaah")
    agenda.define('hihi', async (job, done) => {
        try {
            
            const { electrics: ElectricsModel } = global.mongoModel;
            const urlDevices = 'http://homeland-2.ddns.net:8005/api/v1/devices/';
            const resListDevice: AxiosResponse = await axios.get(urlDevices);

            const countDevice = resListDevice.data.length;
            // console.log("countDevice", countDevice);

            // console.log(resListDevice.data[0]);



            for (let i = 0; i < countDevice; i++) {
                let urlData = `http://homeland-2.ddns.net:8005/api/v1/devices/${resListDevice.data[i].Id}/data?limit=1`
                const resData: AxiosResponse = await axios.get(urlData);
                // console.log(`resData ${resListDevice.data[i].Id}`, resData.data.Records[0]);

                const dataGet = resData.data.Records[0];

                let originTime = new Date(dataGet.Time);
                originTime.setHours(originTime.getHours() + 7);

                const electricData = await ElectricsModel.create({
                    IdDevice: dataGet.DeviceId,
                    NameRoom: resListDevice.data[i].Name,
                    Time: originTime,
                    Total_kWh: dataGet.Value.Total_kWh,
                    Export_kWh: dataGet.Value.Export_kWh,
                    Import_kWh: dataGet.Value.Import_kWh,
                    Voltage: dataGet.Value.Voltage,
                    Current: dataGet.Value.Current,
                    Active_Power: dataGet.Value.Active_Power,
                    Reactive_Power: dataGet.Value.Reactive_Power,
                    Power_Factor: dataGet.Value.Power_Factor,
                    Frequency: dataGet.Value.Frequency,
                });

            }
            const day = new Date();
            console.log("day", day);
            console.log("GetAndSaveEnergy success");
            done();
        } catch (err) {
            console.log("GetAndSaveEnergy faild");
            done();
        }
    });

    (async function () {
        await agenda.start();
        
        // await agenda.every('*/2 * * * *', 'hihi');
        await agenda.every('0 * * * *', "hihi");
        // await global.agendaInstance.agenda.schedule(moment().endOf('minutes').toDate(), 'hihi');
      })();

}