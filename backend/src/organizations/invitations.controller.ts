import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AcceptInvitationDto, InvitationTokenDto } from './dto/accept-invitation.dto';
import { InvitationsService } from './invitations.service';

/**
 * Endpoints del invitado. El token viaja en el cuerpo (no en la URL) para que
 * no quede en logs de acceso ni en el historial de proxies.
 */
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  preview(@Body() dto: InvitationTokenDto) {
    return this.invitations.preview(dto.token);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitations.acceptWithNewAccount(dto);
  }

  @Post('accept-existing')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  acceptExisting(@Body() dto: InvitationTokenDto, @CurrentUser('userId') userId: string) {
    return this.invitations.acceptAsUser(dto.token, userId);
  }
}
