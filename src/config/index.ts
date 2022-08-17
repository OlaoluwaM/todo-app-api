import 'dotenv/config';

const config = {
  PORT: process.env.PORT || 5000,
  HOST: process.env.NODE_ENV === 'development' ? 'localhost' : process.env.SERVER_PORT,
};

export default config;
