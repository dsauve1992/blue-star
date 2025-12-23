export class ThemeEntity {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static of(data: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): ThemeEntity {
    return new ThemeEntity(data.id, data.name, data.createdAt, data.updatedAt);
  }

  static fromData(data: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  }): ThemeEntity {
    return new ThemeEntity(
      data.id,
      data.name,
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }
}

