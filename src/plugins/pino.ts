import HapiPino from 'hapi-pino';
import { ServerRegisterPluginObject } from '@hapi/hapi';

const pinoPluginConfig: ServerRegisterPluginObject<HapiPino.Options> = {
  plugin: HapiPino,
};

export default pinoPluginConfig;
