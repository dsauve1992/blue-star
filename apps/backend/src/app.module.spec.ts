describe('AppModule', () => {
  const originalCronEnabled = process.env.CRON_ENABLED;

  afterEach(() => {
    if (originalCronEnabled === undefined) delete process.env.CRON_ENABLED;
    else process.env.CRON_ENABLED = originalCronEnabled;
  });

  const loadScheduleImports = (cronEnabled?: string) => {
    if (cronEnabled === undefined) delete process.env.CRON_ENABLED;
    else process.env.CRON_ENABLED = cronEnabled;

    let imports: { module?: { name: string } }[] = [];
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppModule } = require('./app.module') as {
        AppModule: object;
      };
      imports = Reflect.getMetadata('imports', AppModule) as typeof imports;
    });
    return imports.filter((entry) => entry.module?.name === 'ScheduleModule');
  };

  it('schedules cron jobs by default', () => {
    expect(loadScheduleImports()).toHaveLength(1);
  });

  it('registers no scheduler when CRON_ENABLED is false', () => {
    expect(loadScheduleImports('false')).toHaveLength(0);
  });
});
