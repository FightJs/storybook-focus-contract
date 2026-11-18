export function localViteUrl(output) {
  return output.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
}
