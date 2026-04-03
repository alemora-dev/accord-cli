#!/usr/bin/env node
import { buildProgram } from "./cli/entry.js";

await buildProgram().parseAsync(process.argv);
