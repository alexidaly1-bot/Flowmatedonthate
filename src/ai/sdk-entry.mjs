// Bundled by tools/build.mjs (esbuild) into src/gen/anthropic-sdk.js.
// Exposes the official Anthropic SDK to the classic-script app as window.FMAnthropic.
import Anthropic from '@anthropic-ai/sdk';
window.FMAnthropic = Anthropic;
