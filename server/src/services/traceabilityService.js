import TraceabilityEvent from '../models/TraceabilityEvent.js';

export function addEvent(textileId, eventType, actorId, note = '') {
  return TraceabilityEvent.create({
    textile: textileId,
    eventType,
    actor: actorId,
    note
  });
}