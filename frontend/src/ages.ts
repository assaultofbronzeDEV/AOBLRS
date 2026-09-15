export type AgeId = "age-of-magic" | "age-of-war";

export type AgeDefinition = {
  id: AgeId;
  label: string;
  subtitle: string;
};

export const AGE_DEFINITIONS: AgeDefinition[] = [
  {
    id: "age-of-magic",
    label: "Age of Magic",
    subtitle: "Power-Stones awaken the old world.",
  },
  {
    id: "age-of-war",
    label: "Age of War",
    subtitle: "Power-Stone technology fuels a darker age.",
  },
];

export const DEFAULT_AGE_ID: AgeId = "age-of-magic";

export function ageDefinition(id: AgeId): AgeDefinition {
  return AGE_DEFINITIONS.find((age) => age.id === id) ?? AGE_DEFINITIONS[0];
}
