import {
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

/** Centro de notificaciones del usuario en su empresa. */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('unread') unread?: string,
  ) {
    return this.notifications.list(this.requireOrg(orgId), userId, {
      page,
      pageSize,
      unread: unread === 'true',
    });
  }

  @Get('unread-count')
  unreadCount(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notifications.unreadCount(this.requireOrg(orgId), userId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notifications.markAllRead(this.requireOrg(orgId), userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(this.requireOrg(orgId), userId, id);
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}
