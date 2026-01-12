import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { TestSessionController } from './test-session.controller';
import { GoogleStrategy } from './google.strategy';
import { SessionsService } from './sessions.service';

@Module({
  imports: [PassportModule.register({ session: true })],
  controllers: [AuthController, TestSessionController],
  providers: [GoogleStrategy, SessionsService],
  exports: [SessionsService],
})
export class AuthModule {}
