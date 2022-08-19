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
  test: {
    PORT: 5006,
    HOST: 'localhost',
    POSTGRES_DB: 'test_todos',
  },
};

const ENV = (process.env?.NODE_ENV ?? 'dev') as keyof typeof config;
const currentConfig = config[ENV];
export default { ...commonConfigOptions, ...currentConfig };

export function generateConnectionURI() {
  const { HOST } = currentConfig;
  const { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT } =
    commonConfigOptions;

  return `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
}
