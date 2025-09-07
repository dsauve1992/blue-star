export const UuidGeneratorService = {
  generate: (): string => {
    return crypto.randomUUID();
  },
};
