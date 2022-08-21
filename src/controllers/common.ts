import { GroupID } from '@db/schema';
import { Request } from '@hapi/hapi';

export interface RequestWithUrlParamGroupId extends Request {
  params: { groupId: GroupID, taskId: never } & Request['params'];
}
