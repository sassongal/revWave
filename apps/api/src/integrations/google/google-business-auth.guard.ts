import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleBusinessAuthGuard extends AuthGuard('google-business') {}
