export default () => {
  return {
    general: {
      dbUri: process.env.MONGO_DB_URI,
      defaultTenantCode: process.env.DEFAULT_TENANT_CODE,
    },
    smart: {
      dbUri: process.env.MONGO_DB_URI_SMART,
      defaultTenantCode: process.env.SMART_TENANT_CODE,
    },
    homeKey: {
      dbUri: process.env.MONGO_DB_URI_HOMEKEY,
      defaultTenantCode: process.env.HOMEKEY_TENANT_CODE,
    },
    server: {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      auto_reconnect: true,
      reconnectInterval: 30000, // milliseconds to retry connection
      reconnectTries: Number.MAX_VALUE,
      bufferMaxEntries: 0,
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    }
  };
};
