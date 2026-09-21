import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    if (!authorization) return true;

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Jeton d’authentification invalide');
    }

    try {
      request.user = this.jwt.verify(authorization.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException('Session expirée');
    }
  }
}