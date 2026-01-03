import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuditLogsService } from './audit-logs.service';
import { DataSource } from 'typeorm';
import { User } from '../users/users.entity';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuditLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly audit: AuditLogsService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const method = String(req.method || '').toUpperCase();

    // Only log mutating requests (plus login)
    const shouldLog =
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
      (method === 'POST' && req.path?.includes('/auth/login'));

    if (!shouldLog) {
      return next();
    }

    // Skip noisy endpoints
    if (req.path?.startsWith('/audit-logs')) {
      return next();
    }

    const startedAt = Date.now();

    // Capture response finish
    res.on('finish', async () => {
      try {
        const statusCode = res.statusCode;

        const token = this.extractBearer(req);
        let actor: User | undefined;
        if (token) {
          try {
            const secret = this.config.get<string>('JWT_SECRET') ?? 'TEMP_JWT_SECRET_123';
            const payload: any = jwt.verify(token, secret);
            const userId = Number(payload?.sub);
            if (userId) {
              const userRepo = this.dataSource.getRepository(User);
              const u = await userRepo.findOne({ where: { id: userId } });
              if (u) actor = u;
            }
          } catch {
            // ignore token errors
          }
        }

        const action = this.inferAction(method, req.path);
        const entity = this.inferEntity(req.path);

        await this.audit.create({
          actor,
          department: actor?.department,
          action,
          entity,
          entityId: this.inferEntityId(req),
          description: this.buildDescription(req, statusCode),
          method,
          path: req.originalUrl || req.path,
          statusCode,
          ip: (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '',
          userAgent: String(req.headers['user-agent'] || ''),
          meta: {
            durationMs: Date.now() - startedAt,
            bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body).slice(0, 20) : [],
          },
        });
      } catch {
        // never block request flow
      }
    });

    next();
  }

  private extractBearer(req: Request): string | undefined {
    const header = req.headers?.authorization;
    if (!header) return undefined;
    const m = String(header).match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : undefined;
  }

  private inferEntity(path?: string): string | undefined {
    if (!path) return undefined;
    const parts = path.split('/').filter(Boolean);
    return parts[0];
  }

  private inferAction(method: string, path?: string): string {
    const base = this.inferEntity(path) || 'unknown';
    if (path?.includes('/auth/login')) return 'LOGIN';
    if (method === 'POST') return `CREATE_${base.toUpperCase()}`;
    if (method === 'PUT' || method === 'PATCH') return `UPDATE_${base.toUpperCase()}`;
    if (method === 'DELETE') return `DELETE_${base.toUpperCase()}`;
    return `${method}_${base.toUpperCase()}`;
  }

  private inferEntityId(req: Request): string | undefined {
    // try /resource/:id
    const parts = String(req.path || '').split('/').filter(Boolean);
    if (parts.length >= 2) {
      const maybeId = parts[1];
      if (/^\d+$/.test(maybeId)) return maybeId;
    }

    // fall back to body.id
    const bid = (req.body as any)?.id;
    if (bid != null) return String(bid);
    return undefined;
  }

  private buildDescription(req: Request, statusCode: number): string {
    const name = this.inferEntity(req.path) || 'request';
    const ok = statusCode >= 200 && statusCode < 400;
    if (req.path?.includes('/auth/login')) {
      const email = (req.body as any)?.email;
      return ok ? `Login success${email ? `: ${email}` : ''}` : `Login failed${email ? `: ${email}` : ''}`;
    }
    return ok
      ? `${req.method} ${name} succeeded`
      : `${req.method} ${name} failed (status ${statusCode})`;
  }
}
