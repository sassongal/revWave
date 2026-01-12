import { Session as ExpressSession } from 'express-session';

export interface SessionData {
  userId?: string;
  tenantId?: string;
}

export interface Session extends ExpressSession {
  userId?: string;
  tenantId?: string;
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    tenantId?: string;
  }
}
