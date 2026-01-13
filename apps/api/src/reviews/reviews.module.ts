import { Module, forwardRef } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { RepliesService } from './replies.service';
import { ReviewsController } from './reviews.controller';
import { AiModule } from '../ai/ai.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [AiModule, forwardRef(() => IntegrationsModule)],
  controllers: [ReviewsController],
  providers: [ReviewsService, RepliesService],
  exports: [ReviewsService, RepliesService],
})
export class ReviewsModule {}
