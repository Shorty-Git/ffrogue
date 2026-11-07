import type { UnitActorConfig } from '../entities/UnitActor';

export interface ContentRegistry {
  schemaVersion: 1;
  characters: string[];
  monsters: string[];
  scenePresentations?: string[];
}

export interface CharacterDefinition {
  schemaVersion: 1;
  key: string;
  battle: UnitActorConfig;
  scale: number;
  portrait?: string;
}
