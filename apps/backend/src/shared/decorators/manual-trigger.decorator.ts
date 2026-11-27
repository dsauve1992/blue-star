import { SetMetadata } from '@nestjs/common';

export const IS_MANUAL_TRIGGER_KEY = 'isManualTrigger';
export const ManualTrigger = () => SetMetadata(IS_MANUAL_TRIGGER_KEY, true);
