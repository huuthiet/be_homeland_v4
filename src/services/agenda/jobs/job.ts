import * as moment from 'moment';

import JobController from '../../../controllers/homeKey/job';
import NotificationController from '../../../controllers/homeKey/notification';

export default agenda => {
    
    // create order
    agenda.define('CreateOrder', async (job, done) => {
        try {
            // Init models
            const {order: orderModel, job: jobModel} = global.mongoModel;

            let data = job.attrs.data;

            let resData = await JobController.getJob(job.attrs.data.jobId);


            if (resData.isActived) {
                await NotificationController.createNotification({
                    title: 'Thông báo đóng tiền phòng',
                    content: 'Vui lòng thanh toán tiền phòng trong vòng 5 ngày.',
                    user: resData.user
                });

                const orderData = await orderModel.create({
                    user: resData.user,
                    job: resData._id,
                    isCompleted: false,
                    description: `Tiền phòng tháng ${moment().month() + 1}`,
                    amount: resData.room.price,
                    type: 'monthly'
                });

                resData = await jobModel.findOneAndUpdate(
                    {_id: resData._id},
                    {
                        $addToSet: {orders: orderData._id},
                        currentOrder: orderData._id,
                        status: 'pendingMonthlyPayment'
                    },
                    {new: true});

                await global.agendaInstance.agenda.schedule(moment().endOf('month').toDate(), 'CheckOrderStatus', {orderId: orderData._id});
                await global.agendaInstance.agenda.schedule(moment().startOf('month').add(1, 'months').toDate(), 'CreateOrder', {jobId: resData._id});
            }
            done();
        } catch (err) {
            done();
        }
    });

    // create first month order
    agenda.define('CreateFirstMonthOrder', async (job, done) => {
        try {
            // Init models
            const {order: orderModel, job: jobModel} = global.mongoModel;

            let data = job.attrs.data;

            let resData = await JobController.getJob(job.attrs.data.jobId);

            if (resData.isActivated) {
                await NotificationController.createNotification({
                    title: 'Thông báo đóng tiền phòng',
                    content: 'Vui lòng thanh toán tiền phòng trong vòng 5 ngày.',
                    user: resData.user
                });

                const orderData = await orderModel.create({
                    user: resData.user,
                    job: resData._id,
                    isCompleted: false,
                    description: `Tiền phòng tháng ${moment().month() + 1} `,
                    amount: (resData.room.price / 30) * (moment(resData.checkInTime).endOf('month').diff(moment(resData.checkInTime), 'days')),
                    type: 'monthly'
                });

                resData = await jobModel.findOneAndUpdate(
                    {_id: resData._id},
                    {
                        $addToSet: {orders: orderData._id},
                        currentOrder: orderData._id,
                        status: 'pendingMonthlyPayment'
                    },
                    {new: true});

                await global.agendaInstance.agenda.schedule(moment().endOf('month').toDate(), 'CheckOrderStatus', {orderId: orderData._id});
                await global.agendaInstance.agenda.schedule(moment().startOf('month').add(1, 'months').toDate(), 'CreateOrder', {jobId: resData._id});
            }
            done();
        } catch (err) {
            done();
        }
    });

    // check order status
    agenda.define('CheckOrderStatus', async (job, done) => {
        try {
            // Init models
            const {order: orderModel, job: jobModel} = global.mongoModel;

            let data = job.attrs.data;

            let orderData = await orderModel.findOne(job.attrs.data.orderId);

            if (!orderData.isCompleted) {
                await NotificationController.createNotification({
                    title: 'Thông báo hết hạn đóng tiền phòng',
                    content: 'Vui lòng liên hệ nhân viên để được hỗ trợ.',
                    user: orderData.user
                });

                await jobModel.findOneAndUpdate(
                    {orders: orderData._id},
                    {
                        isActivated: false
                    },
                    {new: true});
            }

            done();
        } catch (err) {
            done();
        }
    });

    // check job status
    agenda.define('CheckJobStatus', async (job, done) => {
        try {
            // Init models
            const {order: orderModel, job: jobModel} = global.mongoModel;

            let data = job.attrs.data;

            let jobData = await jobModel.findOne(job.attrs.data.jobId);

            if (!job.isActived) {
                await NotificationController.createNotification({
                    title: 'Thông báo hết hạn kích hoạt',
                    content: 'Bạn đã quá hạn nhận phòng. Hệ thống tự hủy đặt phòng.',
                    user: jobData.user
                });

                await jobModel.findOneAndUpdate({_id: jobData._id}, {status: 'expiredActivated'}).exec();
            }

            done();
        } catch (err) {
            done();
        }
    });
}