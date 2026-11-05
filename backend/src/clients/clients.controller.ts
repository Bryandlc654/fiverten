import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClientsService } from './clients.service';
import { CreateClientRelationDto, UpdateClientRelationDto } from './dto/client-relation.dto';

@Controller('organizations/me/client-relations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(
    @CurrentUser('organizationId') orgId: string | null,
    @Query('projectId') projectId?: string,
  ) {
    return this.clients.list(this.requireOrg(orgId), projectId);
  }

  @Post()
  @Roles('editor')
  create(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateClientRelationDto,
  ) {
    return this.clients.create(this.requireOrg(orgId), userId, dto);
  }

  @Patch(':id')
  @Roles('editor')
  update(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientRelationDto,
  ) {
    return this.clients.update(this.requireOrg(orgId), id, dto);
  }

  @Delete(':id')
  @Roles('editor')
  remove(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clients.remove(this.requireOrg(orgId), id);
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}
