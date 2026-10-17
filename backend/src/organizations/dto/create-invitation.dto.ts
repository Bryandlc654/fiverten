import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ORGANIZATION_ROLES, type OrganizationRole } from '../../common/roles';

/**
 * Invitación de un miembro. Nunca crea usuarios ni membresías directamente:
 * el invitado recibe un enlace y es él quien acepta y, si no tiene cuenta,
 * elige su propia contraseña.
 */
export class CreateInvitationDto {
  @IsEmail({}, { message: 'El correo del usuario no es válido' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsIn(ORGANIZATION_ROLES, { message: 'Rol no válido' })
  role?: OrganizationRole;
}
