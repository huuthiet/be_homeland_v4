export default () => {
    return {
        basePath: process.env.BASE_PATH,
        protocol: process.env.PROTOCOL,
        jwtSecret: process.env.JWT_SECRET,
        defaultAccessUsername: process.env.DEFAULT_ACCESS_USERNAME,
        defaultAccessPassword: process.env.DEFAULT_ACCESS_PASSWORD,
        hashSalt: process.env.HASH_SALT,
        branchKey: process.env.BRANCH_KEY,
        webBaseUrl: process.env.WEB_BASE_URL,
        webBaseUrlUser: process.env.WEB_BASE_URL_USER,
        mode: process.env.NODE_ENV
    }
};