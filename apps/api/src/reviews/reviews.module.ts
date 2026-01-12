import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { RepliesService } from './replies.service';
import { ReviewsController } from './reviews.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, RepliesService],
  exports: [ReviewsService, RepliesService],
})
export class ReviewsModule {}
