import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import { APP_ROLES } from "../constants/roles";
import { SUBJECTS } from "../constants/routes";

export function defineAbilityFor(role) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  can("visit", SUBJECTS.ACCOUNT);

  if (role === APP_ROLES.PATIENT) {
    can("visit", SUBJECTS.BOOKING);
    can("visit", SUBJECTS.APPOINTMENTS);
    can("visit", SUBJECTS.SUPPORT);
  }

  if (role === APP_ROLES.PSYCHIATRIST) {
    can("visit", SUBJECTS.APPOINTMENTS);
    can("visit", SUBJECTS.SCHEDULE);
    can("visit", SUBJECTS.SUPPORT);
  }

  if (role === APP_ROLES.ADMIN) {
    can("visit", SUBJECTS.ADMINISTRATION);
    can("visit", SUBJECTS.ADMIN_APPOINTMENTS);
    can("visit", SUBJECTS.ADMIN_SCHEDULES);
    can("visit", SUBJECTS.SUPPORT);
  }

  return build();
}
