import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';

interface AuthResult {
  accessToken: string | null;
  refreshToken: string | null;
  refreshExpiresAt: Date | null;
  [key: string]: unknown;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto, this.context(req));
    return this.settle(res, result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, this.context(req));
    return this.settle(res, result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[this.cookieName] as string | undefined;
    const result = await this.auth.refresh(token, this.context(req));
    return this.settle(res, result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[this.cookieName] as string | undefined;
    await this.auth.logout(token);
    res.clearCookie(this.cookieName, this.clearCookieOptions());
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('userId') userId: string) {
    return this.auth.me(userId);
  }

  // ---------------------------------------------------------------------------
  // Verificación de correo electrónico
  // ---------------------------------------------------------------------------
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post('verify-email/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  requestEmailVerification(@CurrentUser('userId') userId: string) {
    return this.auth.requestEmailVerification(userId);
  }

  // ---------------------------------------------------------------------------
  // Recuperación de contraseña
  // ---------------------------------------------------------------------------
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.auth.forgotPassword(dto.email, this.context(req));
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.auth.resetPassword(dto.token, dto.newPassword, this.context(req));
  }

  // ---------------------------------------------------------------------------
  // Gestión de sesiones
  // ---------------------------------------------------------------------------
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  listSessions(
    @CurrentUser('userId') userId: string,
    @CurrentUser('sessionId') sessionId: string | null,
  ) {
    return this.auth.listSessions(userId, sessionId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  revokeSession(@CurrentUser('userId') userId: string, @Param('id') sessionId: string) {
    return this.auth.revokeSession(userId, sessionId);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logoutAll(@CurrentUser('userId') userId: string, @Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.cookieName, this.clearCookieOptions());
    return this.auth.logoutAll(userId);
  }

  // ---------------------------------------------------------------------------
  private settle(res: Response, result: AuthResult) {
    const { refreshToken, refreshExpiresAt, ...publicResult } = result;
    // El registro con verificación de correo obligatoria no emite sesión.
    if (refreshToken && refreshExpiresAt) {
      res.cookie(this.cookieName, refreshToken, this.cookieOptions(refreshExpiresAt));
    }
    return publicResult;
  }

  private context(req: Request) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }

  private get cookieName(): string {
    return this.config.get<string>('REFRESH_COOKIE_NAME') ?? 'fiverten_refresh';
  }

  private get cookiePath(): string {
    return this.config.get<string>('COOKIE_PATH') ?? '/api/auth';
  }

  private get isProduction(): boolean {
    return (this.config.get<string>('NODE_ENV') ?? 'development') === 'production';
  }

  private get sameSite(): CookieOptions['sameSite'] {
    const raw = (this.config.get<string>('COOKIE_SAMESITE') ?? 'lax').toLowerCase();
    return raw === 'strict' || raw === 'none' || raw === 'lax' ? raw : 'lax';
  }

  private resolveSecure(): boolean {
    const raw = this.config.get<string>('COOKIE_SECURE');
    if (raw !== undefined && raw !== '') {
      return raw === 'true' || raw === '1';
    }
    return this.isProduction;
  }

  private cookieOptions(expiresAt: Date): CookieOptions {
    const sameSite = this.sameSite;
    return {
      httpOnly: true,
      // SameSite=None exige Secure por especificacion.
      secure: sameSite === 'none' ? true : this.resolveSecure(),
      sameSite,
      path: this.cookiePath,
      expires: expiresAt,
    };
  }

  private clearCookieOptions(): CookieOptions {
    const sameSite = this.sameSite;
    return {
      httpOnly: true,
      secure: sameSite === 'none' ? true : this.resolveSecure(),
      sameSite,
      path: this.cookiePath,
    };
  }
}
