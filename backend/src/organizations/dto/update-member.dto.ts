import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { ORGANIZATION_ROLES, type OrganizationRole } from '../../common/roles';

export class UpdateMemberDto {
  @IsOptional()
  @IsIn(ORGANIZATION_ROLES, { message: 'Rol no válido' })
  role?: OrganizationRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
