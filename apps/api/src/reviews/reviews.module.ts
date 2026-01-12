import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { RepliesService } from './replies.service';
import { ReviewsController } from './reviews.controller';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, RepliesService],
  exports: [ReviewsService, RepliesService],
})
export class ReviewsModule {}
