import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerificationReviewer } from '../auth/decorators/verification-reviewer.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerificationReviewerGuard } from '../auth/guards/verification-reviewer.guard';
import { ReviewVerificationDto } from './dto/moderation.dto';
import { ModerationService } from './moderation.service';

@Controller('admin/review-verifications')
@UseGuards(JwtAuthGuard, VerificationReviewerGuard)
@VerificationReviewer()
export class ReviewVerificationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post(':id')
  @HttpCode(HttpStatus.OK)
  set(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.moderation.setReviewVerification(userId, id, dto);
  }
}
