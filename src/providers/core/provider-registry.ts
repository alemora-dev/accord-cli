import type { AbstractProvider } from "./abstract-provider.js";

export class ProviderRegistry {
  constructor(private readonly providers: AbstractProvider[]) {}

  list(): AbstractProvider[] {
    return [...this.providers];
  }
}
