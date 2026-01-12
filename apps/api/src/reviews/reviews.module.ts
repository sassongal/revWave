import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { RepliesService } from './replies.service';

@Module({
  providers: [ReviewsService, RepliesService],
  exports: [ReviewsService, RepliesService],
})
export class ReviewsModule {}
