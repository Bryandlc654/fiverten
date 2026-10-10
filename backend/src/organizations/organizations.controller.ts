import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('me')
  getMine(@CurrentUser('organizationId') orgId: string | null) {
    return this.organizations.getMine(this.requireOrg(orgId));
  }

  @Patch('me')
  @Roles('admin')
  updateMine(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizations.updateMine(this.requireOrg(orgId), userId, dto);
  }

  @Get('me/members')
  listMembers(@CurrentUser('organizationId') orgId: string | null) {
    return this.organizations.listMembers(this.requireOrg(orgId));
  }

  @Post('me/members')
  @Roles('manager')
  addMember(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMemberDto,
  ) {
    return this.organizations.addMember(this.requireOrg(orgId), userId, dto);
  }

  @Patch('me/members/:id')
  @Roles('manager')
  updateMember(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id') membershipId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.organizations.updateMember(this.requireOrg(orgId), userId, membershipId, dto);
  }

  @Delete('me/members/:id')
  @Roles('admin')
  removeMember(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id') membershipId: string,
  ) {
    return this.organizations.removeMember(this.requireOrg(orgId), userId, membershipId);
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}
