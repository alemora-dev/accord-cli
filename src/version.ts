export const VERSION = (await Bun.file(new URL('../VERSION', import.meta.url)).text()).trim();
