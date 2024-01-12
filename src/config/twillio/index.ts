export default () => {
    return {
        number: process.env.TWILIO_NUMBER,
        sid: process.env.TWILIO_SID,
        auth: process.env.TWILIO_AUTH,
        content: 'Mã xác thực của bạn là: '
    }
}