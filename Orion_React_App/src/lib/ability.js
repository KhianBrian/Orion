import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import { APP_ROLES } from "../constants/roles";
import { SUBJECTS } from "../constants/routes";

export function defineAbilityFor(role) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  can("visit", SUBJECTS.ACCOUNT);

  if (role === APP_ROLES.PATIENT) {
    can("visit", SUBJECTS.BOOKING);
    can("visit", SUBJECTS.APPOINTMENTS);
  }

  if (role === APP_ROLES.PSYCHIATRIST) {
    can("visit", SUBJECTS.APPOINTMENTS);
  }

  if (role === APP_ROLES.ADMIN) {
    can("visit", SUBJECTS.ADMINISTRATION);
  }

  return build();
}
