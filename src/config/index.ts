import 'dotenv/config';

const commonConfigOptions = {
  POSTGRES_PORT: process.env.POSTGRES_PORT || 5432,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_DB: process.env.POSTGRES_DB,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
};

const config = {
  dev: {
    PORT: 5000,
    HOST: 'localhost',
  },
  container: {
    PORT: process.env.PORT,
    HOST: process.env.SERVER_HOST,
  },
};

const ENV = (process.env?.NODE_ENV ?? 'dev') as keyof typeof config;
export default { ...config[ENV], ...commonConfigOptions };
