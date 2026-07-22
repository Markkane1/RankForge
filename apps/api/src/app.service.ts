import { Injectable } from '@nestjs/common';
import { prisma } from '@rankforge/database';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getClientsCount(): Promise<number> {
    return prisma.client.count();
  }
}
