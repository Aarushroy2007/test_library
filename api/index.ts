import { apiApp } from '../server/api.ts';

export default function handler(req: any, res: any) {
  return apiApp(req, res);
}
