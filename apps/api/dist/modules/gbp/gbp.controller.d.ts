import { GbpService } from './gbp.service';
import { UpdateGbpProfileDto } from './gbp.dto';
import type { Response } from 'express';
export declare class GbpController {
    private readonly gbpService;
    constructor(gbpService: GbpService);
    initOAuth(clientId: string, res: Response): void;
    oauthCallback(code: string, clientId: string, error: string, res: Response): Promise<void>;
    updateProfile(clientId: string, body: UpdateGbpProfileDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
