import {
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTicketDto, TicketMessageDto, UpdateTicketDto } from './dto/support.dto';
import { SupportStaffGuard } from './support.guard';
import { SupportService } from './support.service';

@Controller('organizations/me/tickets')
@UseGuards(JwtAuthGuard)
export class CompanySupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  list(
    @CurrentUser('organizationId') orgId: string | null,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.support.listForCompany(this.requireOrg(orgId), {
      page,
      pageSize,
      status,
      priority,
      search,
    });
  }

  @Post()
  create(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.support.createForCompany(this.requireOrg(orgId), userId, dto);
  }

  @Get(':id')
  get(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.support.getForCompany(this.requireOrg(orgId), id);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.OK)
  reply(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TicketMessageDto,
  ) {
    return this.support.replyAsCompany(this.requireOrg(orgId), userId, id, dto);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.support.closeAsCompany(this.requireOrg(orgId), userId, id);
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}

@Controller('support')
@UseGuards(JwtAuthGuard, SupportStaffGuard)
export class SupportStaffController {
  constructor(private readonly support: SupportService) {}

  @Get('stats')
  stats(@CurrentUser('userId') userId: string) {
    return this.support.stats(userId);
  }

  @Get('tickets')
  list(
    @CurrentUser('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigned') assigned?: string,
    @Query('search') search?: string,
  ) {
    return this.support.listForSupport(
      { page, pageSize, status, priority, assigned, search },
      userId,
    );
  }

  @Get('tickets/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.support.getForSupport(id);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.OK)
  reply(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TicketMessageDto,
  ) {
    return this.support.replyAsSupport(userId, id, dto);
  }

  @Patch('tickets/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.support.updateTicket(id, dto);
  }

  @Post('tickets/:id/assign-me')
  @HttpCode(HttpStatus.OK)
  assignMe(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.support.assignToMe(id, userId);
  }
}
