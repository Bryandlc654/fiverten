import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import {
  CreateOrganizationLocationDto,
  UpdateOrganizationLocationDto,
} from './dto/organization-location.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InvitationsService } from './invitations.service';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly invitations: InvitationsService,
  ) {}

  @Get('me')
  getMine(@CurrentUser('organizationId') orgId: string | null) {
    return this.organizations.getMine(this.requireOrg(orgId));
  }

  @Get('me/slug-availability')
  slugAvailability(
    @CurrentUser('organizationId') orgId: string | null,
    @Query('slug') slug?: string,
  ) {
    return this.organizations.slugAvailability(this.requireOrg(orgId), slug ?? '');
  }

  @Get('me/locations')
  listLocations(@CurrentUser('organizationId') orgId: string | null) {
    return this.organizations.listLocations(this.requireOrg(orgId));
  }

  @Post('me/locations')
  @Roles('editor')
  createLocation(
    @CurrentUser('organizationId') orgId: string | null,
    @Body() dto: CreateOrganizationLocationDto,
  ) {
    return this.organizations.createLocation(this.requireOrg(orgId), dto);
  }

  @Patch('me/locations/:id')
  @Roles('editor')
  updateLocation(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationLocationDto,
  ) {
    return this.organizations.updateLocation(this.requireOrg(orgId), id, dto);
  }

  @Delete('me/locations/:id')
  @Roles('editor')
  deleteLocation(@CurrentUser('organizationId') orgId: string | null, @Param('id') id: string) {
    return this.organizations.deleteLocation(this.requireOrg(orgId), id);
  }

  @Patch('me')
  @Roles('editor')
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

  // Las altas van por invitación: el invitado acepta desde el enlace del correo.
  @Get('me/invitations')
  @Roles('admin')
  listInvitations(@CurrentUser('organizationId') orgId: string | null) {
    return this.invitations.listPending(this.requireOrg(orgId));
  }

  @Post('me/invitations')
  @Roles('admin')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  invite(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitations.invite(this.requireOrg(orgId), userId, dto);
  }

  @Delete('me/invitations/:id')
  @Roles('admin')
  revokeInvitation(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id') invitationId: string,
  ) {
    return this.invitations.revoke(this.requireOrg(orgId), userId, invitationId);
  }

  @Patch('me/members/:id')
  @Roles('admin')
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
