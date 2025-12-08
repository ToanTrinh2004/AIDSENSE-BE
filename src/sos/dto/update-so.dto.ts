import { PartialType } from '@nestjs/mapped-types';
import { CreateSosDto } from './create-so.dto';

export class UpdateSosDto extends PartialType(CreateSosDto) {}
