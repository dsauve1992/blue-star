import { Injectable } from '@nestjs/common';
import { createKindeServerClient, GrantType } from '@kinde-oss/kinde-typescript-sdk';
import { kindeConfig } from '../config/kinde.config';

@Injectable()
export class KindeService {
  private readonly kindeClient;

  constructor() {
    this.kindeClient = createKindeServerClient(GrantType.AUTHORIZATION_CODE, {
      authDomain: kindeConfig.domain,
      clientId: kindeConfig.clientId,
      clientSecret: kindeConfig.clientSecret,
      redirectURL: kindeConfig.redirectURL,
      logoutRedirectURL: kindeConfig.logoutRedirectURL,
    });
  }

  getClient() {
    return this.kindeClient;
  }

  async verifyToken(token: string) {
    try {
      const user = await this.kindeClient.getUserProfile(token);
      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  getIssuer() {
    return kindeConfig.domain;
  }

  getAudience() {
    return kindeConfig.clientId;
  }
}
