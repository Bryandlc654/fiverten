import {
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformAdmin } from '../auth/decorators/platform-admin.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffMfaGuard } from '../auth/guards/staff-mfa.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BillingService } from './billing.service';
import {
  CancelSubscriptionDto,
  ChangePlanDto,
  CreatePaymentDto,
  PlanDto,
  UpdatePaymentDto,
  UpdatePlanDto,
  UpdateSubscriptionDto,
  UpsertSubscriptionDto,
} from './dto/billing.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, StaffMfaGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('billing/stats')
  stats() {
    return this.billing.stats();
  }

  @Get('plans')
  listPlans() {
    return this.billing.listPlans(true);
  }

  @Post('plans')
  createPlan(@Body() dto: PlanDto) {
    return this.billing.createPlan(dto);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.billing.updatePlan(id, dto);
  }

  @Get('subscriptions')
  listSubscriptions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.billing.listSubscriptions({ page, pageSize, search, status });
  }

  @Get('organizations/:id/subscription')
  getOrganizationSubscription(@Param('id') id: string) {
    return this.billing.getOrganizationSubscription(id);
  }

  @Put('organizations/:id/subscription')
  upsertOrganizationSubscription(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpsertSubscriptionDto,
  ) {
    return this.billing.upsertOrganizationSubscription(id, dto, userId);
  }

  @Patch('subscriptions/:id')
  updateSubscription(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.billing.updateSubscription(id, dto, userId);
  }

  @Post('subscriptions/:id/cancel')
  cancelSubscription(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.billing.cancelSubscription(id, dto, userId);
  }

  @Get('payments')
  listPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.billing.listPayments({ page, pageSize, status, organizationId });
  }

  @Post('payments')
  createPayment(@CurrentUser('userId') userId: string, @Body() dto: CreatePaymentDto) {
    return this.billing.createPayment(dto, userId);
  }

  @Patch('payments/:id')
  updatePayment(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.billing.updatePayment(id, dto);
  }
}

@Controller('organizations/me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscription')
  subscription(@CurrentUser('organizationId') orgId: string | null) {
    return this.billing.companySubscription(this.requireOrg(orgId));
  }

  @Post('subscription/change')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  changePlan(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.billing.changeCompanyPlan(this.requireOrg(orgId), userId, dto.planId);
  }

  @Get('payments')
  payments(
    @CurrentUser('organizationId') orgId: string | null,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.billing.companyPayments(this.requireOrg(orgId), { page, pageSize });
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('La cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}

@Controller('public')
export class PublicBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
  async plans() {
    const result = await this.billing.listPlans(false);
    return { plans: result.plans.filter((plan) => plan.isPublic) };
  }
}
