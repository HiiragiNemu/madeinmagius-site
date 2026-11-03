import { magirecoGone } from '../../../lib/magireco-withdrawal.js';
export function onRequest(context) { return magirecoGone(context.request); }
export const onRequestGet=onRequest;
export const onRequestHead=onRequest;
