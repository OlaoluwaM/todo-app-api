import * as Inert from '@hapi/inert';
import * as Vision from '@hapi/vision';
import * as HapiSwagger from 'hapi-swagger';

import { ServerRegisterPluginObject } from '@hapi/hapi';

// code omitted for brevity

const swaggerOptions: HapiSwagger.RegisterOptions = {
  info: {
    title: 'Todo API Documentation',
    version: 'v1',
    description:
      'Todo API where groups correspond with collections of todos (todo lists), and tasks with todo list items',
  },
  grouping: 'tags',
  sortEndpoints: 'method',
};

const swaggerPluginConfig: Array<ServerRegisterPluginObject<any>> = [
  {
    plugin: Inert,
  },
  {
    plugin: Vision,
  },
  {
    plugin: HapiSwagger,
    options: swaggerOptions,
  },
];

export default swaggerPluginConfig;
