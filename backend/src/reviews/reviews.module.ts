import { Module } from '@nestjs/common';
import { AdminCasesController } from './admin-cases.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewCasesService } from './cases.service';
import { CompanyCasesController } from './company-cases.controller';
import { ModerationService } from './moderation.service';
import { PublicCasesController } from './public-cases.controller';
import { PublicResolutionsController } from './public-resolutions.controller';
import { PublicReviewsController } from './public-reviews.controller';
import { PublicReviewsService } from './public-reviews.service';
import { ResolutionsService } from './resolutions.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [
    PublicReviewsController,
    PublicResolutionsController,
    PublicCasesController,
    ReviewsController,
    CompanyCasesController,
    AdminReviewsController,
    AdminCasesController,
  ],
  providers: [
    PublicReviewsService,
    ReviewsService,
    ModerationService,
    ResolutionsService,
    ReviewCasesService,
  ],
})
export class ReviewsModule {}
